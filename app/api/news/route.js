// Proxy Kagi RSS to avoid CORS and handle redirects server-side

const ALLOWED_CATEGORIES = new Set([
  'world',
  'ai',
  'tech',
  'business',
  'science',
]);

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category')?.trim().toLowerCase() || 'world';

    if (!ALLOWED_CATEGORIES.has(category)) {
      return new Response(
        JSON.stringify({ error: 'Invalid category' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const targetUrl = `https://news.kagi.com/${category}.xml`;
    const upstream = await fetch(targetUrl, {
      // Follow redirects and avoid caching in Next to keep it fresh
      redirect: 'follow',
      cache: 'no-store',
      // Some servers behave better with a UA
      headers: {
        'User-Agent': 'LingDaily/1.0 (+https://talknews.ai)'
      }
    });

    if (!upstream.ok) {
      return new Response(
        JSON.stringify({ error: `Upstream error ${upstream.status}` }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const rss = await upstream.text();
    return new Response(rss, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err?.message || 'Unexpected error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
