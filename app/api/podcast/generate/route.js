
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import { XMLParser } from 'fast-xml-parser';

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize Gemini
// Note: User provided empty constructor in snippet, but likely needs apiKey if not in env automatically?
// Usually it picks up GOOGLE_API_KEY or GEMINI_API_KEY. I'll pass it explicitly to be safe if I can find it, 
// or assume the SDK handles process.env.GEMINI_API_KEY if passed in constructor.
// Based on snippet: const ai = new GoogleGenAI({}); 
// I will check if I need to pass key. Usually: new GoogleGenAI({ apiKey: ... })
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function toWavBuffer(pcmData) {
    // Manual WAV header construction
    // defined: 1 channel, 24000Hz, 16-bit
    const channels = 1;
    const sampleRate = 24000;
    const bitDepth = 16;
    const dataLength = pcmData.length;

    const buffer = Buffer.alloc(44);

    // RIFF identifier
    buffer.write('RIFF', 0);
    // RIFF chunk length
    buffer.writeUInt32LE(36 + dataLength, 4);
    // WAVE identifier
    buffer.write('WAVE', 8);
    // fmt chunk identifier
    buffer.write('fmt ', 12);
    // fmt chunk length
    buffer.writeUInt32LE(16, 16);
    // Sample format (1 is PCM)
    buffer.writeUInt16LE(1, 20);
    // Channels
    buffer.writeUInt16LE(channels, 22);
    // Sample rate
    buffer.writeUInt32LE(sampleRate, 24);
    // Byte rate (SampleRate * BlockAlign)
    const byteRate = sampleRate * channels * (bitDepth / 8);
    buffer.writeUInt32LE(byteRate, 28);
    // Block align (Channels * BitDepth / 8)
    buffer.writeUInt16LE(channels * (bitDepth / 8), 32);
    // Bits per sample
    buffer.writeUInt16LE(bitDepth, 34);
    // data chunk identifier
    buffer.write('data', 36);
    // data chunk length
    buffer.writeUInt32LE(dataLength, 40);

    return Buffer.concat([buffer, pcmData]);
}

// Helper for async backup save (fire and forget)
async function backupAudioToDisk(filepath, buffer) {
    try {
        await fs.promises.writeFile(filepath, buffer);
        console.log("Async backup saved to:", filepath);
    } catch (err) {
        console.error("Failed to save backup audio:", err);
    }
}

// Allow longer timeout for this generation
export const maxDuration = 60;

export async function POST(req) {
    try {
        const body = await req.json();
        const { category = 'world' } = body;

        const dateFolder = new Date().toISOString().split('T')[0];

        // 0. Check Cache
        // We check if we already have a podcast for this category and date
        const { data: cachedPodcasts, error: cacheError } = await supabase
            .from('podcasts')
            .select('*')
            .eq('category', category)
            .eq('date_folder', dateFolder)
            .limit(1);

        if (cachedPodcasts && cachedPodcasts.length > 0) {
            console.log("Serving from cache");
            const cached = cachedPodcasts[0];

            let finalAudioUrl = cached.audio_url;
            // If the URL is a public one (no token) or we want to ensure freshness for private bucket:
            // Attempt to re-sign it.
            if (cached.audio_url && cached.audio_url.includes('/podcasts/')) {
                const parts = cached.audio_url.split('/podcasts/');
                if (parts.length > 1) {
                    const filePath = parts[1]; // e.g. "2026-01-01/fname.wav"
                    const { data: resigned, error: resignError } = await supabase
                        .storage
                        .from('podcasts')
                        .createSignedUrl(filePath, 31536000); // 1 year

                    if (!resignError && resigned?.signedUrl) {
                        finalAudioUrl = resigned.signedUrl;
                    }
                }
            }

            return NextResponse.json({
                title: cached.title,
                summary: cached.summary,
                audioUrl: finalAudioUrl,
                imageUrl: cached.image_url,
                category: cached.category
            });
        }

        // 1. Fetch News
        // Using Kagi RSS proxy as per other routes or direct depending on environment.
        // Using the logic from news/route.js but executing here or fetching locally.
        // Since fetch to localhost might be flaky in build, we redo the fetch logic.
        const newsUrl = `https://news.kagi.com/${category}.xml`;
        const feedRes = await fetch(newsUrl, {
            headers: { 'User-Agent': 'LingDaily/1.0 (+https://talknews.ai)' }
        });

        if (!feedRes.ok) throw new Error('Failed to fetch news');

        const feedText = await feedRes.text();
        const parser = new XMLParser();
        const feed = parser.parse(feedText);
        // Handle RSS structure variations safely
        const channel = feed.rss?.channel || feed.feed;
        const itemsRaw = channel?.item || channel?.entry || [];
        const items = Array.isArray(itemsRaw) ? itemsRaw.slice(0, 5) : [itemsRaw].slice(0, 1);

        if (items.length === 0) {
            return NextResponse.json({ error: "No items found" }, { status: 404 });
        }

        const newsContext = items.map((item, i) => `
  Item ${i + 1}:
  Title: ${item.title}
  Description: ${item.description || item.summary || ''}
  PubDate: ${item.pubDate || item.published || ''}
`).join('\n\n');

        // Extract image
        // Try to find an image in the first item
        let imageUrl = '/placeholder.jpg';
        const firstItem = items[0];
        const desc = firstItem.description || '';
        const imgMatch = desc.match(/src="([^"]+)"/);
        if (imgMatch) {
            imageUrl = imgMatch[1];
        } else if (firstItem['media:content'] && firstItem['media:content']['@_url']) {
            imageUrl = firstItem['media:content']['@_url'];
        }

        // 2. Generate Content (Title, Summary, Script)
        // We use a separate call for text generation
        const scriptPrompt = `
  You are a professional podcast producer for "LingDaily News".
  Information:
  ${newsContext}

  Task:
  Also generate a title and a podcast script.

  Requirements:
  1. **Title**: Catchy, relevant to the headlines.
  2. **Summary**: A comprehensive, well-structured summary of the news stories provided. MUST be at least 1000 words. Use markdown for formatting. This is for reading.
  3. **Podcast Script**: A dialogue or monologue for a host named "Jaz".
     - Mix of Chinese and English. (Mainly English, explain difficult concepts in Chinese, or casual switching).
     - Tone: Energetic, clear, "The Morning Hype" style.

  Output JSON:
  {
    "title": "String",
    "summary": "String (Markdown, >1000 words)",
    "script": "String (The text only, no cues)"
  }
`;

        const scriptResponse = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [{ parts: [{ text: scriptPrompt }] }],
            config: {
                responseMimeType: "application/json"
            }
        });

        const scriptJsonStr = scriptResponse.candidates?.[0]?.content?.parts?.[0]?.text;
        let generatedData;
        try {
            generatedData = JSON.parse(scriptJsonStr);
        } catch (e) {
            console.error("Failed to parse JSON", scriptJsonStr);
            throw new Error("AI response format error");
        }

        const { title, summary, script } = generatedData;

        // 3. Generate Audio
        console.log("Generating Audio for script length:", script.length, "now generate audio");

        // Construct the advanced prompt for TTS
        const ttsPrompt = `
# AUDIO PROFILE: Jaz R.
## "The LingDaily Host"

## THE SCENE: The Studio
The content is news. Energetic, clear study vibe.

### DIRECTOR'S NOTES
Style:
* The "Vocal Smile": Bright, sunny, inviting.
* Bilingual: Fluent English with natural Chinese explanations or interjections.
* Pace: Energetic but clear.

#### TRANSCRIPT
${script}
`;

        const ttsResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: ttsPrompt }] }],
            config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });

        const audioDataInfo = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!audioDataInfo) {
            throw new Error("No audio data generated");
        }

        const audioBuffer = Buffer.from(audioDataInfo, 'base64');
        console.log("Audio Buffer Size:", audioBuffer.length);

        if (audioBuffer.length === 0) {
            throw new Error("Audio buffer is empty");
        }

        const tempUuid = uuidv4();
        const tempWavPath = path.join('/tmp', `news-${tempUuid}.wav`);

        // Convert PCM to WAV in memory
        const wavBuffer = toWavBuffer(audioBuffer);

        // Start async backup to disk (fire and forget, no await)
        backupAudioToDisk(tempWavPath, wavBuffer);

        // 4. Upload to Supabase (using the memory buffer directly)
        const fileContent = wavBuffer;
        // const dateFolder IS ALREADY DEFINED AT START OF FUNCTION
        const safeTitle = title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').substring(0, 60);
        const fileName = `${dateFolder}/${category}-${safeTitle}.wav`;

        const { data: uploadData, error: uploadError } = await supabase
            .storage
            .from('podcasts')
            .upload(fileName, fileContent, {
                contentType: 'audio/wav',
                upsert: false
            });

        if (uploadError) {
            console.error("Supabase Upload Error:", uploadError);
            throw new Error("Failed to upload audio");
        }

        console.log("Audio uploaded successfully");

        // Get Signed URL (valid for 1 year) since bucket might be private
        // Supabase signed URLs are necessary if the bucket is not public.
        const { data: signedUrlData, error: signError } = await supabase
            .storage
            .from('podcasts')
            .createSignedUrl(fileName, 31536000); // 1 year

        if (signError) {
            console.error("Signed URL Generation Error:", signError);
        }

        const publicAudioUrl = signedUrlData?.signedUrl || "";

        // Cleanup
        // Backup file is kept for debugging/backup purposes
        // as requested by user.
        // fs.unlinkSync(tempWavPath);

        // 5. Save to Database
        const { error: dbError } = await supabase.from('podcasts').insert({
            category,
            title,
            summary,
            script,
            image_url: imageUrl,
            audio_url: publicAudioUrl,
            date_folder: dateFolder
        });

        if (dbError) {
            console.error("Database Insert Error:", dbError);
            // We don't fail the request if DB insert fails, just log it, as user gets the data anyway
        }

        return NextResponse.json({
            title,
            summary,
            audioUrl: publicAudioUrl,
            imageUrl,
            category
        });

    } catch (err) {
        console.error("API Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
