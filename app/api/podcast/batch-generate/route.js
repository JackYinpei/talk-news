import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import { XMLParser } from 'fast-xml-parser';
import { v4 as uuidv4 } from 'uuid';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { toWavBuffer, cleanDescription, backupAudioToDisk, GENERATION_PROMPTS } from '@/app/lib/podcastGeneratorUtils';


const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const CATEGORIES = ['world', 'tech', 'business', 'science', 'sports', 'ai', 'crypto', 'gaming'];

// 允许长时间运行（Vercel Pro 可用 5 分钟）
export const maxDuration = 300;

// Local functions removed in favor of imports from podcastGeneratorUtils

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
    const scriptPrompt = GENERATION_PROMPTS.script(newsContext);

    const scriptResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: scriptPrompt }] }],
        config: { responseMimeType: "application/json" }
    });

    const scriptJsonStr = scriptResponse.candidates?.[0]?.content?.parts?.[0]?.text;
    const generatedData = JSON.parse(scriptJsonStr);
    const { title, summary, script } = generatedData;

    // 生成音频
    const ttsPrompt = GENERATION_PROMPTS.tts(script);

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

    // Save to tmp (backup)
    const tempUuid = uuidv4();
    const tempWavPath = path.join('/tmp', `news-${category}-${tempUuid}.wav`);
    backupAudioToDisk(tempWavPath, wavBuffer);

    // 上传到 Supabase with Retry
    const fileName = `${dateFolder}/${category}-${tempUuid}.wav`;
    let uploadError = null;
    let uploadSuccess = false;

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const { error } = await supabase
                .storage
                .from('podcasts')
                .upload(fileName, wavBuffer, {
                    contentType: 'audio/wav',
                    upsert: false
                });

            if (!error) {
                uploadSuccess = true;
                break;
            }
            uploadError = error;
            console.warn(`Upload attempt ${attempt} failed for ${category}: ${error.message}. Retrying...`);
        } catch (e) {
            uploadError = e;
            console.warn(`Upload attempt ${attempt} failed for ${category}: ${e.message}. Retrying...`);
        }
        // Wait 1s before retry
        await new Promise(r => setTimeout(r, 1000));
    }

    if (!uploadSuccess) {
        throw new Error(`Upload failed after 3 attempts: ${uploadError?.message || 'Unknown error'}`);
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
