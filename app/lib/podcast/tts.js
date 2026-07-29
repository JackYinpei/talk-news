// Synthesize each script chunk with Gemini multi-speaker TTS, then concat into one MP3.
// Splitting per chunk keeps each TTS call under the "few minutes" drift threshold.

import { mkdir, writeFile, rm } from "node:fs/promises";
import Mp3Encoder from "@breezystack/lamejs";
import { HOST_A, HOST_B, countHanCharacters, countLatinWords } from "./script.js";
import { backoffDelay, isRetryableApiError, sleep } from "./retry.js";
import { createServerGeminiClient } from "@/app/lib/server/geminiConfig";

// The preview TTS model has two failure modes seen in production: 503 "high
// demand" bursts, and HTTP 200 responses whose audio is glitched — transcript
// read twice, one phrase stuck in a loop, or a minute of silence appended
// (2026-07-29 episode). Transient failures retry with backoff and fail over to
// the previous-generation TTS model this pipeline used before; glitched audio
// is caught by the duration check below and retried the same way. Both models
// are overridable so ops can swap them without a redeploy.
const PRIMARY_TTS_MODEL = (process.env.PODCAST_TTS_MODEL || "gemini-3.1-flash-tts-preview").trim();
const FALLBACK_TTS_MODEL = (process.env.PODCAST_TTS_FALLBACK_MODEL ?? "gemini-2.5-flash-preview-tts").trim();
const TTS_MODELS = [PRIMARY_TTS_MODEL, FALLBACK_TTS_MODEL].filter(
  (model, index, all) => model && all.indexOf(model) === index,
);
const MAX_TRANSIENT_RETRIES = 4;
const TRANSIENT_RETRIES_BEFORE_FALLBACK = 2;
const MAX_BAD_AUDIO_RETRIES = 3;
const BAD_AUDIO_RETRIES_BEFORE_FALLBACK = 2;

const SAMPLE_RATE = 24000;
const CHANNELS = 1;
const SAMPLE_WIDTH = 2;
const MP3_KBPS = 96;

const VOICE_A = "Zephyr";     // Warm
const VOICE_B = "Orus";       // Upbeat

// Duration plausibility window for a chunk's audio. Published episodes run
// 0.77x-0.96x of this text-based estimate, so the window is generous in both
// directions: a false reject burns a whole TTS attempt, while today's glitches
// land far outside it (the doubled intro measured ~2.4x after silence trim).
const HAN_CHARS_PER_SECOND = 5;
const LATIN_WORDS_PER_SECOND = 2.5;
const TURN_GAP_SECONDS = 0.8;
const MIN_DURATION_RATIO = 0.5;
const MAX_DURATION_RATIO = 1.6;

// Glitched responses can pad the chunk with long dead air. Trimming the edges
// first means an otherwise-good take with a silent tail is salvaged rather than
// rejected, and listeners never sit through a minute of nothing mid-episode.
const SILENCE_AMPLITUDE = 500; // ~1.5% of int16 full scale
const EDGE_KEEP_SECONDS = 0.6; // natural pause left at each chunk boundary

const DIRECTOR_PREAMBLE = `You are synthesizing a daily bilingual English/Mandarin news podcast.

AUDIO PROFILE
- ${HOST_A}: warm, thoughtful, mid-range voice. Sounds like a friend who has read the news carefully and wants to share it.
- ${HOST_B}: upbeat, curious, lively voice. Brings energy and asks follow-up questions.

DIRECTOR'S NOTES
- Style: friendly, enthusiastic, conversational — the "vocal smile" is audible. They react to each other, not read from a script.
- Pacing: natural spoken pace; slight speed-ups on excitement words, gentle pauses at story transitions.
- Language: the transcript is organized into two-turn bilingual pairs. The first turn is Mandarin and the second is its natural English counterpart, spoken by the other host.
- Keep each turn in its written language. Do not merge the pair into one mixed-language turn; English names or learning terms inside Mandarin are the only normal exception.
- Preserve the speaker labels exactly. Language ownership swaps between pairs, so the same host may intentionally have two adjacent turns at a pair boundary.
- Accent: standard Mandarin for Chinese turns and clear, neutral English for English turns.
- Do not read bracketed directions or speaker labels out loud.
- Read the transcript exactly once from start to finish. Never repeat a line or restart the dialogue.

TRANSCRIPT (synthesize this dialogue):
`;

function renderChunkTranscript(chunk) {
  return chunk.turns.map((t) => `${t.speaker}: ${t.text}`).join("\n");
}

function renderChunkPrompt(chunk) {
  return DIRECTOR_PREAMBLE + renderChunkTranscript(chunk);
}

// Encode concatenated PCM buffers directly to MP3 using lamejs (no ffmpeg needed).
function pcmBuffersToMp3(pcmBuffers) {
  const encoder = new Mp3Encoder.Mp3Encoder(CHANNELS, SAMPLE_RATE, MP3_KBPS);
  const mp3Parts = [];

  for (const pcm of pcmBuffers) {
    // lamejs expects Int16Array
    const samples = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.byteLength / 2);
    const blockSize = 1152;
    for (let i = 0; i < samples.length; i += blockSize) {
      const chunk = samples.subarray(i, i + blockSize);
      const encoded = encoder.encodeBuffer(chunk);
      if (encoded.length > 0) mp3Parts.push(Buffer.from(encoded));
    }
  }

  const flushed = encoder.flush();
  if (flushed.length > 0) mp3Parts.push(Buffer.from(flushed));

  return Buffer.concat(mp3Parts);
}

export function estimateChunkSeconds(chunk) {
  let seconds = 0;
  for (const turn of chunk.turns) {
    seconds += countHanCharacters(turn.text) / HAN_CHARS_PER_SECOND
      + countLatinWords(turn.text) / LATIN_WORDS_PER_SECOND
      + TURN_GAP_SECONDS;
  }
  return seconds;
}

// A response may split long audio across several inline parts; taking only the
// first would silently truncate the chunk.
function extractChunkPcm(response) {
  const parts = response?.candidates?.[0]?.content?.parts || [];
  const audioParts = parts
    .map((part) => part?.inlineData?.data)
    .filter(Boolean)
    .map((data) => Buffer.from(data, "base64"));
  if (audioParts.length === 0) {
    throw new Error("response contains no audio data (possibly text token fallthrough)");
  }
  // Buffer.concat also re-allocates, guaranteeing the 2-byte alignment that the
  // Int16Array views below require.
  const pcm = Buffer.concat(audioParts);
  return pcm.byteLength % SAMPLE_WIDTH === 0 ? pcm : pcm.subarray(0, pcm.byteLength - 1);
}

export function trimEdgeSilence(pcm) {
  const samples = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.byteLength / SAMPLE_WIDTH);
  let first = 0;
  while (first < samples.length && Math.abs(samples[first]) < SILENCE_AMPLITUDE) first += 1;
  if (first >= samples.length) return Buffer.alloc(0);
  let last = samples.length - 1;
  while (last > first && Math.abs(samples[last]) < SILENCE_AMPLITUDE) last -= 1;
  const keep = Math.round(EDGE_KEEP_SECONDS * SAMPLE_RATE);
  const start = Math.max(first - keep, 0);
  const end = Math.min(last + 1 + keep, samples.length);
  return pcm.subarray(start * SAMPLE_WIDTH, end * SAMPLE_WIDTH);
}

// Trim edge silence, then reject audio whose spoken length is implausible for
// the chunk's text — the signature of a repeated/looping or truncated take.
export function validateChunkAudio(chunk, pcm) {
  const trimmed = trimEdgeSilence(pcm);
  const seconds = trimmed.byteLength / SAMPLE_WIDTH / SAMPLE_RATE;
  const expected = estimateChunkSeconds(chunk);
  const lower = Math.max(expected * MIN_DURATION_RATIO - 5, 3);
  const upper = expected * MAX_DURATION_RATIO + 10;
  if (seconds < lower || seconds > upper) {
    throw new Error(
      `audio runs ${seconds.toFixed(1)}s but the transcript should take ~${expected.toFixed(0)}s `
      + `(accepted ${lower.toFixed(0)}-${upper.toFixed(0)}s); the model likely repeated, looped, or truncated it`,
    );
  }
  return trimmed;
}

export async function synthesizeChunkWithRetry(ai, chunk) {
  let modelIndex = 0;
  let transientRetries = 0;
  let badAudioRetries = 0;

  while (true) {
    const model = TTS_MODELS[modelIndex];

    // Phase 1: the API call. Failures here are classified like the script
    // phase: transient overloads retry with backoff and eventually fail over.
    let response;
    try {
      response = await ai.models.generateContent({
        model,
        contents: [{ parts: [{ text: renderChunkPrompt(chunk) }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: [
                { speaker: HOST_A, voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_A } } },
                { speaker: HOST_B, voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_B } } },
              ],
            },
          },
        },
      });
    } catch (apiError) {
      const message = apiError instanceof Error ? apiError.message : String(apiError);

      if (!isRetryableApiError(apiError)) {
        // A permanent error on the preview model (deprecated or renamed, as
        // preview models routinely are) would fail every day until someone
        // noticed, so give the stable model one shot before surfacing it.
        if (modelIndex < TTS_MODELS.length - 1) {
          console.warn(
            `[podcast/tts] Chunk "${chunk.name}": ${model} failed permanently (${message}); trying ${TTS_MODELS[modelIndex + 1]}.`,
          );
          modelIndex += 1;
          continue;
        }
        throw new Error(`TTS chunk "${chunk.name}" failed: ${message}`);
      }

      if (transientRetries >= MAX_TRANSIENT_RETRIES) {
        throw new Error(
          `TTS chunk "${chunk.name}" failed after ${transientRetries} transient retries: ${message}`,
        );
      }
      transientRetries += 1;
      if (modelIndex < TTS_MODELS.length - 1 && transientRetries >= TRANSIENT_RETRIES_BEFORE_FALLBACK) {
        modelIndex += 1;
      }
      console.warn(
        `[podcast/tts] Transient error from ${model} on chunk "${chunk.name}" (retry ${transientRetries}/${MAX_TRANSIENT_RETRIES}): ${message}`,
      );
      await sleep(backoffDelay(transientRetries));
      continue;
    }

    // Phase 2: the call succeeded, so judge the audio itself. Unusable audio
    // (missing, repeated/looping, truncated) earns a fresh synthesis attempt,
    // switching to the stable model once the preview misbehaves twice.
    try {
      return validateChunkAudio(chunk, extractChunkPcm(response));
    } catch (audioError) {
      const message = audioError instanceof Error ? audioError.message : String(audioError);
      if (badAudioRetries >= MAX_BAD_AUDIO_RETRIES) {
        throw new Error(`TTS chunk "${chunk.name}" kept returning unusable audio: ${message}`);
      }
      badAudioRetries += 1;
      if (modelIndex < TTS_MODELS.length - 1 && badAudioRetries >= BAD_AUDIO_RETRIES_BEFORE_FALLBACK) {
        modelIndex += 1;
      }
      console.warn(
        `[podcast/tts] Unusable audio from ${model} on chunk "${chunk.name}" (retry ${badAudioRetries}/${MAX_BAD_AUDIO_RETRIES}): ${message}`,
      );
      await sleep(backoffDelay(badAudioRetries));
    }
  }
}

function estimateMp3Duration(pcmBuffers) {
  const totalSamples = pcmBuffers.reduce((acc, b) => acc + b.byteLength / SAMPLE_WIDTH, 0);
  return Math.round(totalSamples / SAMPLE_RATE);
}

// Synthesize every chunk, concat to single MP3, return { size, duration }.
export async function synthesizePodcast(script, { outputMp3Path, workDir }) {
  const ai = createServerGeminiClient();
  if (!ai) throw new Error("Gemini API key is not configured");

  await mkdir(workDir, { recursive: true });

  const pcmBuffers = [];
  for (const chunk of script.chunks) {
    const pcm = await synthesizeChunkWithRetry(ai, chunk);
    pcmBuffers.push(pcm);
  }

  const duration = estimateMp3Duration(pcmBuffers);
  const mp3Buffer = pcmBuffersToMp3(pcmBuffers);
  await writeFile(outputMp3Path, mp3Buffer);

  await rm(workDir, { recursive: true, force: true });

  return { size: mp3Buffer.length, duration, mp3Buffer };
}
