import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/server/geminiConfig", () => ({
  createServerGeminiClient: vi.fn(),
}));

import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServerGeminiClient } from "@/app/lib/server/geminiConfig";
import {
  estimateChunkSeconds,
  synthesizeChunkWithRetry,
  synthesizePodcast,
  trimEdgeSilence,
  validateChunkAudio,
} from "@/app/lib/podcast/tts";

const SAMPLE_RATE = 24000;

// A chunk whose text-based estimate is ~9.8s: one Chinese turn (23 han chars)
// and one English turn (9 latin words), plus the per-turn gap allowance.
function smallChunk(name = "intro") {
  return {
    name,
    turns: [
      { speaker: "LL", text: "今天我们聊聊全球市场的重要变化以及背后的主要原因。" },
      { speaker: "DD", text: "Today we unpack the key change in global markets." },
    ],
  };
}

function speechPcm(seconds) {
  const samples = new Int16Array(Math.round(seconds * SAMPLE_RATE));
  for (let i = 0; i < samples.length; i += 1) {
    samples[i] = Math.round(Math.sin(i / 7) * 8000);
  }
  return Buffer.from(samples.buffer);
}

function silencePcm(seconds) {
  return Buffer.alloc(Math.round(seconds * SAMPLE_RATE) * 2);
}

function audioResponse(...pcmBuffers) {
  return {
    candidates: [
      {
        content: {
          parts: pcmBuffers.map((pcm) => ({ inlineData: { data: pcm.toString("base64") } })),
        },
      },
    ],
  };
}

function seconds(pcm) {
  return pcm.byteLength / 2 / SAMPLE_RATE;
}

describe("chunk duration estimate", () => {
  it("accounts for both languages plus turn gaps", () => {
    const estimate = estimateChunkSeconds(smallChunk());
    expect(estimate).toBeGreaterThan(8);
    expect(estimate).toBeLessThan(12);
  });
});

describe("edge silence trim", () => {
  it("keeps only a short pause around the speech", () => {
    const pcm = Buffer.concat([silencePcm(5), speechPcm(10), silencePcm(60)]);
    const trimmed = trimEdgeSilence(pcm);
    expect(seconds(trimmed)).toBeGreaterThan(10);
    expect(seconds(trimmed)).toBeLessThan(11.5);
  });

  it("returns an empty buffer for pure silence", () => {
    expect(trimEdgeSilence(silencePcm(20)).byteLength).toBe(0);
  });
});

describe("chunk audio validation", () => {
  it("salvages a good take that has a long silent tail", () => {
    const pcm = Buffer.concat([speechPcm(10), silencePcm(74)]);
    const trimmed = validateChunkAudio(smallChunk(), pcm);
    expect(seconds(trimmed)).toBeLessThan(11.5);
  });

  it("rejects audio that runs several times the transcript length", () => {
    expect(() => validateChunkAudio(smallChunk(), speechPcm(30))).toThrow(/repeated, looped, or truncated/);
  });
});

describe("chunk synthesis", () => {
  it("concatenates every inline audio part instead of only the first", async () => {
    const generateContent = vi.fn().mockResolvedValue(
      audioResponse(speechPcm(5), speechPcm(5)),
    );
    const pcm = await synthesizeChunkWithRetry({ models: { generateContent } }, smallChunk());

    expect(generateContent).toHaveBeenCalledTimes(1);
    expect(seconds(pcm)).toBeGreaterThan(9.5);
  });

  it("retries when the model repeats the transcript, like the 2026-07-29 intro", async () => {
    vi.useFakeTimers();
    try {
      const generateContent = vi.fn()
        // Tripled transcript plus a long silent tail — like the observed glitch,
        // which ran ~2.4x its estimate even after the silence was trimmed.
        .mockResolvedValueOnce(audioResponse(Buffer.concat([speechPcm(30), silencePcm(74)])))
        .mockResolvedValueOnce(audioResponse(speechPcm(10)));

      const promise = synthesizeChunkWithRetry({ models: { generateContent } }, smallChunk());
      await vi.runAllTimersAsync();
      const pcm = await promise;

      expect(generateContent).toHaveBeenCalledTimes(2);
      expect(seconds(pcm)).toBeLessThan(11.5);
    } finally {
      vi.useRealTimers();
    }
  });

  it("fails over to the stable TTS model when the preview stays overloaded", async () => {
    vi.useFakeTimers();
    try {
      const overload = Object.assign(new Error("model is experiencing high demand"), { status: 503 });
      const generateContent = vi.fn()
        .mockRejectedValueOnce(overload)
        .mockRejectedValueOnce(overload)
        .mockResolvedValueOnce(audioResponse(speechPcm(10)));

      const promise = synthesizeChunkWithRetry({ models: { generateContent } }, smallChunk());
      await vi.runAllTimersAsync();
      await promise;

      const models = generateContent.mock.calls.map((call) => call[0].model);
      expect(models[0]).toBe("gemini-3.1-flash-tts-preview");
      expect(models[2]).toBe("gemini-2.5-flash-preview-tts");
    } finally {
      vi.useRealTimers();
    }
  });

  it("tries the stable model once when the preview model fails permanently", async () => {
    const gone = Object.assign(new Error("requested model was not found"), { status: 404 });
    const generateContent = vi.fn()
      .mockRejectedValueOnce(gone)
      .mockResolvedValueOnce(audioResponse(speechPcm(10)));

    await synthesizeChunkWithRetry({ models: { generateContent } }, smallChunk());

    expect(generateContent).toHaveBeenCalledTimes(2);
    expect(generateContent.mock.calls[1][0].model).toBe("gemini-2.5-flash-preview-tts");
  });

  it("gives up after exhausting bad-audio retries rather than publishing a glitch", async () => {
    vi.useFakeTimers();
    try {
      const generateContent = vi.fn().mockResolvedValue(audioResponse(speechPcm(30)));

      const promise = synthesizeChunkWithRetry({ models: { generateContent } }, smallChunk());
      const expectation = expect(promise).rejects.toThrow(/kept returning unusable audio/);
      await vi.runAllTimersAsync();
      await expectation;

      expect(generateContent).toHaveBeenCalledTimes(4);
      // The stable model gets a chance before the chunk is abandoned.
      expect(generateContent.mock.calls.at(-1)[0].model).toBe("gemini-2.5-flash-preview-tts");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("podcast synthesis", () => {
  it("writes one MP3 covering every chunk and reports its duration", async () => {
    const generateContent = vi.fn().mockResolvedValue(audioResponse(speechPcm(10)));
    createServerGeminiClient.mockReturnValue({ models: { generateContent } });

    const dir = await mkdtemp(path.join(tmpdir(), "podcast-tts-"));
    try {
      const outputMp3Path = path.join(dir, "episode.mp3");
      const script = { chunks: [smallChunk("intro"), smallChunk("outro")] };

      const result = await synthesizePodcast(script, {
        outputMp3Path,
        workDir: path.join(dir, "work"),
      });

      expect(generateContent).toHaveBeenCalledTimes(2);
      expect(result.duration).toBe(20);
      expect(result.size).toBeGreaterThan(1000);
      const written = await readFile(outputMp3Path);
      expect(written.byteLength).toBe(result.size);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
