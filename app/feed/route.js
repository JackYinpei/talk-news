import { getRecentPodcasts } from '@/app/lib/podcastService';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://lingdaily.yasobi.xyz';

function escapeXml(unsafe) {
    if (!unsafe) return '';
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
}

export async function GET() {
    const podcasts = await getRecentPodcasts(100);
    const imageUrl = `${SITE_URL}/podcasts/icon.png`;

    const itemsXml = podcasts.map(episode => {
        const title = escapeXml(episode.title || `${episode.date_folder} - ${episode.category}`);
        // Summary might be Markdown, but RSS description is usually simple text or HTML. 
        // For simplicity and compatibility, we'll treat it as text. 
        // If it contains markdown/HTML, CDATA might be preferred, but escapeXml is safer for broad compatibility if simple.
        const description = escapeXml(episode.summary || '');
        const url = `${SITE_URL}/podcasts/${episode.date_folder}`;
        const audioUrl = escapeXml(episode.audioUrl);
        const pubDate = new Date(episode.created_at).toUTCString();
        // GUID is critical for podcast clients to know if it's new.
        const guid = `${episode.date_folder}-${episode.category}`;

        // Skip if no audio
        if (!episode.audioUrl) return '';

        return `
    <item>
      <title>${title}</title>
      <description>${description}</description>
      <link>${url}</link>
      <guid isPermaLink="false">${guid}</guid>
      <pubDate>${pubDate}</pubDate>
      <enclosure url="${audioUrl}" type="audio/wav" length="0" />
      <itunes:summary>${description}</itunes:summary>
      <itunes:image href="${imageUrl}" />
    </item>`;
    }).join('');

    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>LingDaily</title>
    <link>${SITE_URL}</link>
    <description>News first, English naturally</description>
    <language>en-us</language>
    <itunes:author>LingDaily</itunes:author>
    <itunes:summary>News first, English naturally</itunes:summary>
    <itunes:category text="News">
        <itunes:category text="Tech News" />
    </itunes:category>
    <itunes:owner>
      <itunes:name>LingDaily</itunes:name>
      <itunes:email>slivery@linux.do</itunes:email>
    </itunes:owner>
    <itunes:image href="${imageUrl}" />
    <itunes:explicit>clean</itunes:explicit>
    ${itemsXml}
  </channel>
</rss>`;

    return new Response(rssXml, {
        headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            'Cache-Control': 's-maxage=3600, stale-while-revalidate',
        },
    });
}
