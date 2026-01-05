import { NextResponse } from 'next/server';
import { POST as generatePodcast } from '../generate/route';

const CATEGORIES = ['world', 'tech', 'business', 'science', 'sports', 'ai', 'crypto', 'gaming'];

// 允许长时间运行（Vercel Pro 可用 5 分钟）
export const maxDuration = 300;

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

                // Call the manual generation logic directly
                // We construct a Request object to simulate a call to the generate endpoint
                const url = new URL('/api/podcast/generate', 'http://localhost');
                const podcastReq = new Request(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ category, date: dateFolder })
                });

                const res = await generatePodcast(podcastReq);

                if (!res.ok) {
                    let errorMsg = `Status ${res.status}`;
                    try {
                        const errorData = await res.json();
                        errorMsg = errorData.error || errorMsg;
                    } catch (e) {
                        // ignore json parse error
                    }
                    throw new Error(errorMsg);
                }

                const data = await res.json();

                // Check if it was cached or valid
                if (res.status === 200) {
                    results.push({
                        category,
                        status: 'success',
                        title: data.title
                    });
                    console.log(`${category}: success`);
                } else {
                    errors.push({ category, error: 'Unknown non-200 status' });
                }

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
                generated: results.length,
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
