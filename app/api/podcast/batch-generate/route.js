import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import { XMLParser } from 'fast-xml-parser';
import { v4 as uuidv4 } from 'uuid';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const CATEGORIES = ['world', 'tech', 'business', 'science', 'sports', 'ai', 'crypto', 'gaming'];

// 允许长时间运行（Vercel Pro 可用 5 分钟）
export const maxDuration = 300;

function toWavBuffer(pcmData) {
    const channels = 1;
    const sampleRate = 24000;
    const bitDepth = 16;
    const dataLength = pcmData.length;

    const buffer = Buffer.alloc(44);
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataLength, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(channels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * channels * (bitDepth / 8), 28);
    buffer.writeUInt16LE(channels * (bitDepth / 8), 32);
    buffer.writeUInt16LE(bitDepth, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataLength, 40);

    return Buffer.concat([buffer, pcmData]);
}

async function generatePodcastForCategory(category, dateFolder) {
    // 检查缓存
    const { data: cached } = await supabase
        .from('podcasts')
        .select('id')
        .eq('category', category)
        .eq('date_folder', dateFolder)
        .limit(1);

    if (cached && cached.length > 0) {
        return { category, status: 'cached' };
    }

    // 获取新闻
    const newsUrl = `https://news.kagi.com/${category}.xml`;
    const feedRes = await fetch(newsUrl, {
        headers: { 'User-Agent': 'LingDaily/1.0 (+https://talknews.ai)' }
    });

    if (!feedRes.ok) {
        throw new Error(`Failed to fetch news for ${category}`);
    }

    const feedText = await feedRes.text();
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    const feed = parser.parse(feedText);
    const channel = feed.rss?.channel || feed.feed;
    const itemsRaw = channel?.item || channel?.entry || [];
    const items = Array.isArray(itemsRaw) ? itemsRaw.slice(0, 5) : [itemsRaw].slice(0, 1);

    if (items.length === 0) {
        return { category, status: 'no_news' };
    }

    function cleanDescription(html) {
        if (!html) return '';
        let clean = html;
        clean = clean.replace(/<h3>Sources:?<\/h3>[\s\S]*/i, '');
        clean = clean.replace(/<img[^>]*>/g, '');
        clean = clean.replace(/<a[^>]*>([^<]+)<\/a>/g, '$1');
        clean = clean.replace(/<br\s*\/?>/gi, '\n');
        return clean.trim();
    }

    const newsContext = items.map((item, i) => `
Item ${i + 1}:
Title: ${item.title}
Description: ${cleanDescription(item.description || item.summary || '')}
PubDate: ${item.pubDate || item.published || ''}
`).join('\n\n');

    let imageUrl = '/placeholder.jpg';
    for (const item of items) {
        const desc = item.description || '';
        const imgMatch = desc.match(/src=["']([^"']+)["']/);
        if (imgMatch) {
            imageUrl = imgMatch[1];
            break;
        } else if (item['media:content'] && item['media:content']['@_url']) {
            imageUrl = item['media:content']['@_url'];
            break;
        }
    }

    // 生成内容
    const scriptPrompt = `
Role: You are the Lead Producer for "LingDaily News", a high-end bilingual education podcast.

Context Information:
${newsContext}

Task:
Generate a comprehensive news package based on the provided information, outputting strictly in JSON format.

Requirements:

1. **Title**: Create a catchy, click-worthy headline that blends Chinese and English.

2. **Summary (Deep Dive Analysis)**:
   - Write a structured, professional analysis in Markdown.
   - **Constraint**: MUST be at least 1000 words.
   - Expand with detailed breakdown, background context, potential impact, expert perspectives.

3. **Podcast Script (The Jaz Monologue)**:
   - Host: Jaz. Tone: High energy, enthusiastic, witty.
   - Language Mix: **70% Chinese, 30% English**.
   - **Strict Formatting**: Continuous flow of speech, no markers or cues.

Output Format (JSON):
{
  "title": "...",
  "summary": "...",
  "script": "..."
}
`;

    const scriptResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: scriptPrompt }] }],
        config: { responseMimeType: "application/json" }
    });

    const scriptJsonStr = scriptResponse.candidates?.[0]?.content?.parts?.[0]?.text;
    const generatedData = JSON.parse(scriptJsonStr);
    const { title, summary, script } = generatedData;

    // 生成音频
    const ttsPrompt = `
# AUDIO PROFILE: Jaz R.
## "The LingDaily Host"

### DIRECTOR'S NOTES
Style: Bright, sunny, inviting. Bilingual with natural Chinese and English.

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
    const wavBuffer = toWavBuffer(audioBuffer);

    // 上传到 Supabase
    const tempUuid = uuidv4();
    const fileName = `${dateFolder}/${category}-${tempUuid}.wav`;

    const { error: uploadError } = await supabase
        .storage
        .from('podcasts')
        .upload(fileName, wavBuffer, {
            contentType: 'audio/wav',
            upsert: false
        });

    if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const { data: signedUrlData } = await supabase
        .storage
        .from('podcasts')
        .createSignedUrl(fileName, 31536000);

    const publicAudioUrl = signedUrlData?.signedUrl || "";

    // 保存到数据库
    await supabase.from('podcasts').insert({
        category,
        title,
        summary,
        script,
        image_url: imageUrl,
        audio_url: publicAudioUrl,
        date_folder: dateFolder
    });

    return { category, status: 'generated', title };
}

export async function POST(req) {
    // 验证请求来源
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // 允许 Vercel Cron 或带有正确 secret 的请求
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json().catch(() => ({}));
        const dateFolder = body.date || new Date().toISOString().split('T')[0];

        const results = [];
        const errors = [];

        // 依次生成每个类别（避免 API 速率限制）
        for (const category of CATEGORIES) {
            try {
                console.log(`Generating podcast for ${category}...`);
                const result = await generatePodcastForCategory(category, dateFolder);
                results.push(result);
                console.log(`${category}: ${result.status}`);
            } catch (err) {
                console.error(`Failed to generate ${category}:`, err.message);
                errors.push({ category, error: err.message });
            }
        }

        return NextResponse.json({
            date: dateFolder,
            results,
            errors,
            summary: {
                total: CATEGORIES.length,
                generated: results.filter(r => r.status === 'generated').length,
                cached: results.filter(r => r.status === 'cached').length,
                failed: errors.length
            }
        });

    } catch (err) {
        console.error('Batch generation error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// 支持 GET 请求用于 Vercel Cron
export async function GET(req) {
    return POST(req);
}
