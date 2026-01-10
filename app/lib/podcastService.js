import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CATEGORIES = ['world', 'tech', 'business', 'science', 'sports', 'ai', 'crypto', 'gaming'];

// Helper to sign audio URL
async function signAudioUrl(audioUrl, expiresIn = 31536000) {
    if (audioUrl && audioUrl.includes('/podcasts/')) {
        const parts = audioUrl.split('/podcasts/');
        if (parts.length > 1) {
            const filePath = parts[1].split('?')[0]; // Remove old signature params
            const { data: resigned, error: resignError } = await supabase
                .storage
                .from('podcasts')
                .createSignedUrl(filePath, expiresIn);

            if (!resignError && resigned?.signedUrl) {
                return resigned.signedUrl;
            }
        }
    }
    return audioUrl;
}

export async function getPodcastsByDate(date) {
    try {
        // Get all podcasts for a specific date
        const { data: podcasts, error } = await supabase
            .from('podcasts')
            .select('*')
            .eq('date_folder', date);

        if (error) {
            console.error('Database query error:', error);
            throw new Error('Failed to fetch podcasts');
        }

        // Build result for each category
        const result = await Promise.all(CATEGORIES.map(async category => {
            const podcast = podcasts?.find(p => p.category === category);

            if (podcast) {
                const signedUrl = await signAudioUrl(podcast.audio_url);
                return {
                    category,
                    exists: true,
                    title: podcast.title,
                    summary: podcast.summary,
                    script: podcast.script,
                    audioUrl: signedUrl,
                    audioBytes: podcast.audio_bytes ?? null,
                    audioDurationSeconds: podcast.audio_duration_seconds ?? null,
                    imageUrl: podcast.image_url,
                    createdAt: podcast.created_at
                };
            } else {
                return {
                    category,
                    exists: false
                };
            }
        }));

        return result;

    } catch (err) {
        console.error('getPodcastsByDate Error:', err);
        throw err;
    }
}

export async function getRecentPodcasts(limit = 50) {
    try {
        const { data: podcasts, error } = await supabase
            .from('podcasts')
            .select('title, summary, date_folder, category, audio_url, created_at, audio_bytes, audio_duration_seconds')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Database query error details:', JSON.stringify(error, null, 2));
            throw new Error(`Failed to fetch recent podcasts: ${error.message || JSON.stringify(error)}`);
        }

        // Process and sign URLs
        const result = await Promise.all(podcasts.map(async p => {
            const signedUrl = await signAudioUrl(p.audio_url);
            return {
                ...p,
                audioUrl: signedUrl,
                audioBytes: p.audio_bytes ?? null,
                audioDurationSeconds: p.audio_duration_seconds ?? null
            };
        }));

        return result;
    } catch (err) {
        console.error('getRecentPodcasts Error:', err);
        return [];
    }
}
