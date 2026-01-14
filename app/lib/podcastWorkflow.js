import { GoogleGenAI } from '@google/genai';
import { XMLParser } from 'fast-xml-parser';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from 'fs/promises';
import path from 'path';

// Re-usable client init
export const initClients = () => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const s3Client = new S3Client({
        region: "auto",
        endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
    });

    const elevenLabs = {
        apiKey: process.env.ELEVENLABS_API_KEY,
        voiceId: process.env.ELEVENLABS_VOICE_ID || '56AoDkrOh6qfVPDXZ7Pt',
        modelId: process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2'
    };

    return { ai, s3Client, elevenLabs };
};

/**
 * STEP 1: FETCH NEWS
 */
// Helper to extract image from RSS item
function extractImage(item) {
    if (item['media:content'] && item['media:content']['@_url']) {
        return item['media:content']['@_url'];
    }
    if (item['enclosure'] && item['enclosure']['@_url'] && item['enclosure']['@_type']?.startsWith('image/')) {
        return item['enclosure']['@_url'];
    }
    // Check description for img tag
    const desc = item.description || item.summary || '';
    const match = desc.match(/src=["']([^"']+)["']/);
    if (match) return match[1];
    return null;
}

/**
 * STEP 1: FETCH NEWS
 */
export async function fetchAllNews(categories) {
    const promises = categories.map(async (cat) => {
        try {
            const res = await fetch(`https://news.kagi.com/${cat}.xml`);
            if (!res.ok) return null;
            const xml = await res.text();
            const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
            const feed = parser.parse(xml);
            const items = feed.rss?.channel?.item || feed.feed?.entry || [];
            const list = Array.isArray(items) ? items : [items];

            // Take top 3 items per category
            return {
                category: cat,
                items: list.slice(0, 3).map(item => ({
                    title: item.title,
                    description: cleanText(item.description || item.summary || ''),
                    link: item.link,
                    imageUrl: extractImage(item) // Extract image separately
                }))
            };
        } catch (e) {
            console.error(`Failed to fetch ${cat}`, e);
            return null;
        }
    });

    const results = await Promise.all(promises);
    return results.filter(r => r !== null);
}

function cleanText(html) {
    return html.replace(/<[^>]*>?/gm, ' ').slice(0, 500); // Strip HTML, limit length
}

/**
 * STEP 2: GEMINI CONTENT GENERATION
 */
export async function generateContentWithGemini(newsGroups, aiClient) {
    if (!aiClient) aiClient = initClients().ai;

    // Flatten for prompt
    let promptContext = "";
    newsGroups.forEach(g => {
        promptContext += `\n=== CATEGORY: ${g.category} ===\n`;
        g.items.forEach((item, i) => {
            promptContext += `${i + 1}. ${item.title}: ${item.description}\n`;
        });
    });


    const prompt = `
You are an expert podcast producer and host.
Target Audience: Tech-savvy, curious, bilingual (Chinese/English) listeners looking to improve their English.
Tone: Engaging, flowy, coherent, professional yet conversational.

INPUT NEWS:
${promptContext}

TASK:
1. Select the most interesting stories from the input.
2. Create a JSON output.
3. The 'script' fields MUST form a single COHERENT narrative when concatenated. 
    **Narrative Arc:** Arrange the stories into a coherent flow. Use smooth transitional phrases to connect different topics (e.g., moving from geopolitics to technology).
    **Language & Style (CRITICAL):**
    *   **Primary Language:** **Chinese (Mandarin).** You must tell the story primarily in Chinese.
    *   **English Usage:** Do **NOT** translate full sentences (e.g., do not say "Hello. 你好."). Instead, **"sprinkle"** high-value English words or short phrases into the Chinese sentences naturally.
    *   **The "Contextual Method":** When introducing a specific English term:
        *   Use the English word within the Chinese sentence structure.
        *   Immediately follow it with a brief Chinese translation or explanation in parentheses or flow.
    *   *Bad Example:* "The economy is slowing down. 经济正在放缓。" (Do not do this).
    *   *Good Example:* "最近的数据显示，全球经济正在经历明显的 **downturn**（低迷期）。这种 **sluggish**（迟缓的）增长速度让很多投资者感到 **apprehensive** (忧虑)。"
    **Fixed Intro:** The first item in the JSON must ALWAYS use the following standard opening in the script:
    *   "大家好，欢迎来到 Daily News Deep Dive。在这里，我们不仅解读世界，更帮助你在新闻语境中积累地道的英语词汇。让我们直接进入今天的头条。"
    **Headlines:** The newstitle field must be a catchy headline in **Chinese**.
   
OUTPUT FORMAT (JSON ARRAY):
[
    {
        "order": 1,
        "newstitle": "Headline for Segment",
        "category": "world", // MUST match one of the input categories
        "summary": "Brief summary",
        "script": "The spoken part..."
    }
]
    `;

    const response = await aiClient.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini returned empty response");

    let items = JSON.parse(text);
    if (!Array.isArray(items)) items = [items];

    // Post-process: Attach images from source news based on category
    // And flatten full script
    const validImagesPlain = [];

    items = items.map(item => {
        // Find matching category group
        const group = newsGroups.find(g => g.category.toLowerCase() === (item.category || '').toLowerCase());

        let itemImages = [];
        if (group) {
            // Take all valid images from that category's source items
            itemImages = group.items.map(i => i.imageUrl).filter(Boolean);
        }

        // Add to global list for backup/reference
        validImagesPlain.push(...itemImages);

        return {
            ...item,
            images: itemImages
        };
    });

    const fullScript = items.map(i => i.script).join("\n\n");
    const title = items[0]?.newstitle || "LingDaily Digest";
    const summary = items.map(i => i.summary).join("\n");

    return {
        items,
        fullScript,
        title,
        summary,
        allImages: validImagesPlain
    };
}

/**
 * STEP 3a: GEMINI AUDIO
 */
export async function generateAudioGemini(input, aiClient) {
    if (!aiClient) {
        aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }

    const segments = normalizeGeminiSegments(input);
    if (segments.length === 0) {
        throw new Error("Gemini TTS input text is empty");
    }

    const config = {
        temperature: 1,
        responseModalities: ['AUDIO'],
        speechConfig: {
            voiceConfig: {
                prebuiltVoiceConfig: {
                    voiceName: 'Kore',
                }
            }
        },
    };
    const model = 'gemini-2.5-flash-preview-tts';
    const maxChunkChars = 3500;
    const rpmLimit = 10;
    const minIntervalMs = Math.ceil(60000 / rpmLimit);
    const maxRetries = 2;
    const waitForRateLimit = createRateLimiter(minIntervalMs);

    let accumulatedRawData = [];
    let streamEnded = true;
    let mimeType = ''; // Will capture from first chunk
    let chunkSilenceBuffer = null;
    let segmentSilenceBuffer = null;

    for (let s = 0; s < segments.length; s++) {
        const segmentText = segments[s];
        const textChunks = splitTextIntoChunks(segmentText, maxChunkChars);

        for (let i = 0; i < textChunks.length; i++) {
            console.log(`>>> Starting Gemini TTS Stream (Segment ${s + 1}/${segments.length}, Chunk ${i + 1}/${textChunks.length})...`);

            const chunkText = textChunks[i];
            const {
                rawData,
                mimeType: chunkMimeType,
                streamEnded: chunkStreamEnded
            } = await streamGeminiTtsChunkWithRetry(
                chunkText,
                aiClient,
                model,
                config,
                maxRetries,
                waitForRateLimit
            );

            if (rawData.length === 0) {
                throw new Error(`Gemini TTS returned no audio data for segment ${s + 1}/${segments.length}, chunk ${i + 1}/${textChunks.length}`);
            }

            if (!mimeType && chunkMimeType) {
                mimeType = chunkMimeType;
            } else if (chunkMimeType && mimeType && chunkMimeType !== mimeType) {
                console.warn(`Gemini TTS mimeType changed across chunks: ${mimeType} -> ${chunkMimeType}. Using the first value.`);
            }

            accumulatedRawData.push(...rawData);
            streamEnded = streamEnded && chunkStreamEnded;

            if (i < textChunks.length - 1) {
                if (!chunkSilenceBuffer) {
                    const audioOptions = parseMimeType(mimeType || 'audio/pcm; rate=24000');
                    chunkSilenceBuffer = createSilenceBuffer(audioOptions, 0.2);
                }
                accumulatedRawData.push(chunkSilenceBuffer);
            }
        }

        if (s < segments.length - 1) {
            if (!segmentSilenceBuffer) {
                const audioOptions = parseMimeType(mimeType || 'audio/pcm; rate=24000');
                segmentSilenceBuffer = createSilenceBuffer(audioOptions, 0.4);
            }
            accumulatedRawData.push(segmentSilenceBuffer);
        }
    }

    if (accumulatedRawData.length === 0) {
        throw new Error("Gemini TTS returned no audio data (Stream failed completely)");
    }

    const fullRawBuffer = Buffer.concat(accumulatedRawData);

    // Convert to WAV with proper header
    // If we didn't get a mimeType, default to 'audio/pcm; rate=24000' usually
    /* 
       Gemini usually returns "audio/pcm; rate=24000" or similar.
       We use the provided helpers to parse and add header.
    */
    const finalBuffer = convertToWav(fullRawBuffer, mimeType || 'audio/pcm; rate=24000');

    return {
        buffer: finalBuffer,
        isComplete: streamEnded,
        totalBytes: finalBuffer.length
    };
}

// --- Helpers for Gemini TTS and WAV conversion ---

function normalizeGeminiSegments(input) {
    if (Array.isArray(input)) {
        const segments = input
            .map((item, index) => {
                if (typeof item === 'string') {
                    return { text: item, order: index, index };
                }
                if (item && typeof item === 'object') {
                    const script = typeof item.script === 'string'
                        ? item.script
                        : (typeof item.text === 'string' ? item.text : '');
                    const rawOrder = Number(item.order);
                    const order = Number.isFinite(rawOrder) ? rawOrder : index;
                    return { text: script, order, index };
                }
                return null;
            })
            .filter(Boolean)
            .map(segment => ({
                ...segment,
                text: segment.text.replace(/\r\n/g, '\n').trim()
            }))
            .filter(segment => segment.text.length > 0);

        segments.sort((a, b) => (a.order - b.order) || (a.index - b.index));

        return segments.map(segment => segment.text);
    }

    if (typeof input === 'string') {
        const normalized = input.replace(/\r\n/g, '\n').trim();
        return normalized ? [normalized] : [];
    }

    return [];
}

function createRateLimiter(minIntervalMs) {
    let lastRequestAt = 0;

    return async () => {
        const now = Date.now();
        const waitMs = Math.max(0, lastRequestAt + minIntervalMs - now);
        if (waitMs > 0) {
            await sleep(waitMs);
        }
        lastRequestAt = Date.now();
    };
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function streamGeminiTtsChunkWithRetry(text, aiClient, model, config, maxRetries, waitForRateLimit) {
    let attempt = 0;
    let lastError = null;

    while (attempt <= maxRetries) {
        await waitForRateLimit();

        const result = await streamGeminiTtsChunk(text, aiClient, model, config);
        if (result.rawData.length > 0) {
            return result;
        }

        lastError = new Error("Gemini TTS returned no audio data");
        attempt += 1;

        if (attempt <= maxRetries) {
            const backoffMs = attempt === 1 ? 2000 : 5000;
            console.warn(`Gemini TTS empty response, retrying (attempt ${attempt}/${maxRetries + 1}) after ${backoffMs}ms...`);
            await sleep(backoffMs);
        }
    }

    throw lastError;
}

async function streamGeminiTtsChunk(text, aiClient, model, config) {
    const contents = [
        {
            role: 'user',
            parts: [{ text }],
        },
    ];

    let rawData = [];
    let streamEnded = false;
    let mimeType = '';

    try {
        const response = await aiClient.models.generateContentStream({
            model,
            config,
            contents,
        });

        for await (const chunk of response) {
            if (chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
                const inlineData = chunk.candidates[0].content.parts[0].inlineData;
                if (!mimeType && inlineData.mimeType) {
                    mimeType = inlineData.mimeType;
                }
                if (inlineData.data) {
                    rawData.push(Buffer.from(inlineData.data, 'base64'));
                }
            } else {
                if (chunk.text) console.log("Gemini Stream Text:", chunk.text);
            }
        }
        streamEnded = true;
    } catch (e) {
        console.error("Gemini TTS Stream Interrupted:", e);
        // We continue to process whatever audio we captured
    }

    return { rawData, mimeType, streamEnded };
}

function splitTextIntoChunks(text, maxChars) {
    const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
    const chunks = [];
    let current = '';

    const pushCurrent = () => {
        if (current.trim()) {
            chunks.push(current.trim());
        }
        current = '';
    };

    for (const paragraph of paragraphs) {
        if (paragraph.length > maxChars) {
            pushCurrent();
            const sentences = splitIntoSentences(paragraph);
            let buffer = '';
            for (const sentence of sentences) {
                if (sentence.length > maxChars) {
                    const parts = splitOverlongText(sentence, maxChars);
                    for (const part of parts) {
                        if (!buffer) {
                            buffer = part;
                        } else if (buffer.length + part.length + 1 <= maxChars) {
                            buffer += ` ${part}`;
                        } else {
                            chunks.push(buffer.trim());
                            buffer = part;
                        }
                    }
                    continue;
                }

                if (!buffer) {
                    buffer = sentence;
                } else if (buffer.length + sentence.length + 1 <= maxChars) {
                    buffer += ` ${sentence}`;
                } else {
                    chunks.push(buffer.trim());
                    buffer = sentence;
                }
            }
            if (buffer.trim()) {
                chunks.push(buffer.trim());
            }
            continue;
        }

        if (!current) {
            current = paragraph;
        } else if (current.length + paragraph.length + 2 <= maxChars) {
            current += `\n\n${paragraph}`;
        } else {
            pushCurrent();
            current = paragraph;
        }
    }

    pushCurrent();

    if (chunks.length > 1) {
        const last = chunks[chunks.length - 1];
        const secondLast = chunks[chunks.length - 2];
        if (last.length < Math.floor(maxChars * 0.35) && secondLast.length + last.length + 2 <= maxChars) {
            chunks[chunks.length - 2] = `${secondLast}\n\n${last}`;
            chunks.pop();
        }
    }

    return chunks;
}

function splitIntoSentences(text) {
    const endChars = new Set(['.', '!', '?', ';', '。', '！', '？', '；']);
    const sentences = [];
    let buffer = '';

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        buffer += ch;

        if (endChars.has(ch)) {
            const next = text[i + 1] || '';
            if (next === '' || /\s/.test(next)) {
                if (buffer.trim()) {
                    sentences.push(buffer.trim());
                }
                buffer = '';
            }
        }
    }

    if (buffer.trim()) {
        sentences.push(buffer.trim());
    }

    return sentences;
}

function splitOverlongText(text, maxChars) {
    const parts = [];
    let remaining = text.trim();

    while (remaining.length > maxChars) {
        let cut = remaining.lastIndexOf(' ', maxChars);
        if (cut < Math.floor(maxChars * 0.6)) {
            cut = remaining.lastIndexOf('\n', maxChars);
        }
        if (cut < Math.floor(maxChars * 0.6)) {
            cut = maxChars;
        }

        parts.push(remaining.slice(0, cut).trim());
        remaining = remaining.slice(cut).trim();
    }

    if (remaining) {
        parts.push(remaining);
    }

    return parts;
}

function createSilenceBuffer(options, durationSeconds) {
    const numChannels = options.numChannels || 1;
    const sampleRate = options.sampleRate || 24000;
    const bitsPerSample = options.bitsPerSample || 16;
    const bytesPerSample = bitsPerSample / 8;
    const frameCount = Math.max(1, Math.floor(sampleRate * durationSeconds));
    const totalBytes = frameCount * numChannels * bytesPerSample;

    return Buffer.alloc(totalBytes, 0);
}

function convertToWav(rawBuffer, mimeType) {
    const options = parseMimeType(mimeType);
    const wavHeader = createWavHeader(rawBuffer.length, options);
    return Buffer.concat([wavHeader, rawBuffer]);
}

function parseMimeType(mimeType) {
    // Format usually: "audio/pcm; rate=24000" or similar
    const [fileType, ...params] = mimeType.split(';').map(s => s.trim());
    const [_, format] = fileType.split('/');

    const options = {
        numChannels: 1,
        sampleRate: 24000, // Default fallback
        bitsPerSample: 16  // Default fallback
    };

    if (format && format.startsWith('L')) {
        const bits = parseInt(format.slice(1), 10);
        if (!isNaN(bits)) {
            options.bitsPerSample = bits;
        }
    }

    // Parse params like "rate=24000"
    for (const param of params) {
        const [key, value] = param.split('=').map(s => s.trim());
        if (key === 'rate') {
            options.sampleRate = parseInt(value, 10);
        }
    }

    return options;
}

function createWavHeader(dataLength, options) {
    const {
        numChannels,
        sampleRate,
        bitsPerSample,
    } = options;

    const byteRate = sampleRate * numChannels * bitsPerSample / 8;
    const blockAlign = numChannels * bitsPerSample / 8;
    const buffer = Buffer.alloc(44);

    buffer.write('RIFF', 0);                      // ChunkID
    buffer.writeUInt32LE(36 + dataLength, 4);     // ChunkSize
    buffer.write('WAVE', 8);                      // Format
    buffer.write('fmt ', 12);                     // Subchunk1ID
    buffer.writeUInt32LE(16, 16);                 // Subchunk1Size (PCM)
    buffer.writeUInt16LE(1, 20);                  // AudioFormat (1 = PCM)
    buffer.writeUInt16LE(numChannels, 22);        // NumChannels
    buffer.writeUInt32LE(sampleRate, 24);         // SampleRate
    buffer.writeUInt32LE(byteRate, 28);           // ByteRate
    buffer.writeUInt16LE(blockAlign, 32);         // BlockAlign
    buffer.writeUInt16LE(bitsPerSample, 34);      // BitsPerSample
    buffer.write('data', 36);                     // Subchunk2ID
    buffer.writeUInt32LE(dataLength, 40);         // Subchunk2Size

    return buffer;
}

/**
 * STEP 3b: ELEVENLABS AUDIO
 */
export async function generateAudioElevenLabs(text, config) {
    if (!config) config = initClients().elevenLabs;

    const { apiKey, voiceId, modelId } = config;

    if (!apiKey) throw new Error("ElevenLabs API Key missing");

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'xi-api-key': apiKey
        },
        body: JSON.stringify({
            text: text,
            model_id: modelId || "eleven_multilingual_v2",
            voice_settings: {
                speed: 1.1,
                stability: 0.5,
                similarity_boost: 0.75
            }
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`ElevenLabs API Error: ${err}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

/**
 * STEP 3c: SAVE AUDIO LOCALLY
 */
export async function saveAudioLocally(key, buffer) {
    const baseDir = process.env.PODCAST_AUDIO_TMP_DIR
        || path.join(process.cwd(), 'tmp', 'podcast-audio');
    const cleanKey = key.replace(/^[/\\]+/, '');
    const filePath = path.join(baseDir, cleanKey);

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);

    return filePath;
}

/**
 * STEP 4: UPLOAD TO R2
 */
export async function uploadToR2(key, buffer, s3Client, contentType = 'audio/mpeg') {
    if (!s3Client) s3Client = initClients().s3Client;

    const bucket = process.env.R2_BUCKET_NAME;

    await s3Client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType
    }));

    // Public Bucket with Custom Domain
    const publicDomain = 'https://podcast.yasobi.xyz';

    // Ensure clean path
    const cleanKey = key.replace(/^\//, '');

    return `${publicDomain}/${cleanKey}`;
}

/**
 * HELPER: WAV HEADER
 */
function addWavHeader(pcmData, sampleRate = 24000, numChannels = 1, bitDepth = 16) {
    const header = Buffer.alloc(44);
    const byteRate = sampleRate * numChannels * (bitDepth / 8);
    const blockAlign = numChannels * (bitDepth / 8);
    const dataSize = pcmData.length;
    const chunkSize = 36 + dataSize;

    // RIFF identifier
    header.write('RIFF', 0);
    // Chunk size
    header.writeUInt32LE(chunkSize, 4);
    // WAVE format
    header.write('WAVE', 8);
    // fmt chunk identifier
    header.write('fmt ', 12);
    // Subchunk1Size
    header.writeUInt32LE(16, 16);
    // AudioFormat (1=PCM)
    header.writeUInt16LE(1, 20);
    // NumChannels
    header.writeUInt16LE(numChannels, 22);
    // SampleRate
    header.writeUInt32LE(sampleRate, 24);
    // ByteRate
    header.writeUInt32LE(byteRate, 28);
    // BlockAlign
    header.writeUInt16LE(blockAlign, 32);
    // BitsPerSample
    header.writeUInt16LE(bitDepth, 34);
    // data chunk identifier
    header.write('data', 36);
    // Subchunk2Size
    header.writeUInt32LE(dataSize, 40);

    return Buffer.concat([header, pcmData]);
}

export function estimateDuration(bytes) {
    // MP3 ~128kbps = 16KB/s approx
    // Very rough estimate
    return Math.ceil(bytes / 16000);
}
