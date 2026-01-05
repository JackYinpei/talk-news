import { getPodcastsByDate } from '@/app/lib/podcastService';
import PodcastSharedClient from '@/app/components/PodcastSharedClient';
import { notFound } from 'next/navigation';

export async function generateMetadata(props) {
    const params = await props.params;
    const { date } = params;

    // Fetch podcasts to get dynamic title from 'world' category
    let podcasts = [];
    try {
        podcasts = await getPodcastsByDate(date);
    } catch (e) {
        console.error('Error fetching podcasts for metadata:', e);
    }

    const worldPodcast = podcasts.find(p => p.category === 'world' && p.exists);
    const title = worldPodcast?.title
        ? `${worldPodcast.title} | LingDaily Podcasts ${date}`
        : `LingDaily Podcasts - Archive for ${date}`;

    const description = worldPodcast?.title
        ? `Daily News Archive ${date}: ${worldPodcast.title}. Listen to AI-generated news updates covering world events, technology, and more.`
        : `Listen to AI-generated news podcasts from ${date}. Covering world events, technology, business, and more.`;

    return {
        title: title,
        description: description,
        openGraph: {
            title: title,
            description: description,
        }
    };
}

export default async function PodcastDatePage(props) {
    const params = await props.params;
    const { date } = params;

    // Validate simple format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        notFound();
    }

    const today = new Date().toISOString().split('T')[0];
    if (date > today) {
        notFound();
    }

    // Server-side fetch
    const podcasts = await getPodcastsByDate(date);

    return (
        <PodcastSharedClient initialDate={date} initialPodcasts={podcasts} />
    );
}
