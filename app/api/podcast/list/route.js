import { NextResponse } from 'next/server';
import { getPodcastsByDate } from '@/app/lib/podcastService';

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

        const podcasts = await getPodcastsByDate(date);

        return NextResponse.json({
            date,
            podcasts
        });

    } catch (err) {
        console.error('API Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
