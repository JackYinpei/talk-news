import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CATEGORIES = ['world', 'tech', 'business', 'science', 'sports', 'ai', 'crypto', 'gaming'];

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

        // 获取指定日期的所有 podcast
        const { data: podcasts, error } = await supabase
            .from('podcasts')
            .select('*')
            .eq('date_folder', date);

        if (error) {
            console.error('Database query error:', error);
            return NextResponse.json({ error: 'Failed to fetch podcasts' }, { status: 500 });
        }

        // 为每个类别构建结果，包含是否存在的标记
        const result = CATEGORIES.map(category => {
            const podcast = podcasts?.find(p => p.category === category);

            if (podcast) {
                return {
                    category,
                    exists: true,
                    title: podcast.title,
                    summary: podcast.summary,
                    script: podcast.script,
                    audioUrl: podcast.audio_url,
                    imageUrl: podcast.image_url,
                    createdAt: podcast.created_at
                };
            } else {
                return {
                    category,
                    exists: false
                };
            }
        });

        // 重新签署音频 URL（确保有效性）
        for (const item of result) {
            if (item.exists && item.audioUrl && item.audioUrl.includes('/podcasts/')) {
                const parts = item.audioUrl.split('/podcasts/');
                if (parts.length > 1) {
                    const filePath = parts[1].split('?')[0]; // 移除旧的签名参数
                    const { data: resigned, error: resignError } = await supabase
                        .storage
                        .from('podcasts')
                        .createSignedUrl(filePath, 31536000); // 1 year

                    if (!resignError && resigned?.signedUrl) {
                        item.audioUrl = resigned.signedUrl;
                    }
                }
            }
        }

        return NextResponse.json({
            date,
            podcasts: result
        });

    } catch (err) {
        console.error('API Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
