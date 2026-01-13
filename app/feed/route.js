import { getRecentPodcasts } from '@/app/lib/podcastService';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://lingdaily.yasobi.xyz';
const PODCAST_CDN_BASE_URL = process.env.PODCAST_CDN_BASE_URL || 'https://podcast.shiying.sh.cn';

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

function applyCdnBase(audioUrl) {
    if (!audioUrl) return '';
    try {
        const url = new URL(audioUrl);
        const cdnBase = new URL(PODCAST_CDN_BASE_URL);
        url.protocol = cdnBase.protocol;
        url.host = cdnBase.host;
        return url.toString();
    } catch (err) {
        return audioUrl;
    }
}

function formatItunesDuration(seconds) {
    const totalSeconds = Math.max(0, Math.round(Number(seconds) || 0));
    if (!totalSeconds) return '';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const pad = (val) => String(val).padStart(2, '0');
    if (hours > 0) return `${hours}:${pad(minutes)}:${pad(secs)}`;
    return `${minutes}:${pad(secs)}`;
}

function normalizeEnclosureLength(value) {
    const length = Number.parseInt(value, 10);
    return Number.isFinite(length) && length > 0 ? length : 0;
}

async function getEnclosureLength(audioUrl) {
    if (!audioUrl) return 0;
    try {
        const response = await fetch(audioUrl, { method: 'HEAD' });
        if (!response.ok) return 0;
        const lengthHeader = response.headers.get('content-length');
        if (!lengthHeader) return 0;
        const length = Number.parseInt(lengthHeader, 10);
        return Number.isFinite(length) ? length : 0;
    } catch (err) {
        return 0;
    }
}

export async function GET() {
    const podcasts = await getRecentPodcasts(100, 'all');
    const imageUrl = `${SITE_URL}/podcasts/icon.png`;

    const itemsXml = (await Promise.all(podcasts.map(async episode => {
        const title = escapeXml(episode.title || `${episode.date_folder} - ${episode.category}`);
        // Summary might be Markdown, but RSS description is usually simple text or HTML. 
        // For simplicity and compatibility, we'll treat it as text. 
        // If it contains markdown/HTML, CDATA might be preferred, but escapeXml is safer for broad compatibility if simple.
        const description = escapeXml(episode.summary || '');
        const url = `${SITE_URL}/podcasts/${episode.date_folder}`;
        if (!episode.audioUrl) return '';
        const cdnAudioUrl = applyCdnBase(episode.audioUrl);
        const audioUrl = escapeXml(cdnAudioUrl);
        const enclosureLength = normalizeEnclosureLength(episode.audioBytes) || await getEnclosureLength(cdnAudioUrl);
        const itunesDuration = formatItunesDuration(episode.audioDurationSeconds);
        const pubDate = new Date(episode.created_at).toUTCString();
        // GUID is critical for podcast clients to know if it's new.
        const guid = `${episode.date_folder}-${episode.category}`;

        return `
    <item>
      <title>${title}</title>
      <description>${description}</description>
      <link>${url}</link>
      <guid isPermaLink="false">${guid}</guid>
      <pubDate>${pubDate}</pubDate>
      <enclosure url="${audioUrl}" type="audio/wav" length="${enclosureLength || 0}" />
      ${itunesDuration ? `<itunes:duration>${itunesDuration}</itunes:duration>` : ''}
      <itunes:summary>${description}</itunes:summary>
      <itunes:image href="${imageUrl}" />
    </item>`;
    }))).join('');

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
