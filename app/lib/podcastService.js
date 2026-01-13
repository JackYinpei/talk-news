import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Fetch podcasts for a specific date (folder).
 * @param {string} date - Date string YYYY-MM-DD
 * @returns {Promise<Array>} List of podcasts
 */
export async function getPodcastsByDate(date) {
    const { data, error } = await supabase
        .from('podcasts')
        .select('*')
        .eq('date_folder', date);

    if (error) {
        console.error('Error fetching podcasts by date:', error);
        return [];
    }
    return data || [];
}

/**
 * Fetch recent podcasts.
 * @param {number} limit - Number of podcasts to fetch
 * @param {string} category - Category filter, or 'all'
 * @returns {Promise<Array>} List of podcasts
 */
export async function getRecentPodcasts(limit = 100, category = 'all') {
    let query = supabase
        .from('podcasts')
        .select('*')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (category !== 'all') {
        query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching recent podcasts:', error);
        return [];
    }
    return data || [];
}
