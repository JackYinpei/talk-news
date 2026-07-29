// Fetch and parse Kagi RSS for the podcast pipeline.
// Keeps to the top N items per category, stripping HTML from descriptions.

import { backoffDelay, sleep } from "./retry.js";

const KAGI_CATEGORIES = ["world", "tech", "business"];
const PER_CATEGORY = 3;

// One 5xx or network blip at 05:00 used to kill the whole day's episode, so
// every category now gets a few backoff retries. A category that still has no
// items after that fails the run: letting the script model improvise a news
// block with no source items would put invented "news" on air, which is worse
// than letting cron retry the generation.
const FETCH_ATTEMPTS = 4;
const FETCH_TIMEOUT_MS = 20000;

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function extractTag(block, tag) {
  const cdata = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, "i").exec(block);
  if (cdata) return cdata[1].trim();
  const plain = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i").exec(block);
  return plain ? decodeEntities(plain[1]).trim() : "";
}

function stripHtml(s) {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseItems(xml) {
  const items = [];
  const re = /<item\b[\s\S]*?<\/item>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const block = m[0];
    const title = stripHtml(extractTag(block, "title"));
    const link = extractTag(block, "link");
    const description = stripHtml(extractTag(block, "description"));
    const pubDate = extractTag(block, "pubDate");
    if (title) items.push({ title, link, description, pubDate });
  }
  return items;
}

async function fetchCategory(category) {
  const url = `https://news.kagi.com/${category}.xml`;
  const res = await fetch(url, {
    redirect: "follow",
    cache: "no-store",
    headers: { "User-Agent": "LingDaily/1.0 (+https://lingdaily.ai)" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Kagi ${category} upstream ${res.status}`);
  const xml = await res.text();
  const items = parseItems(xml).slice(0, PER_CATEGORY);
  if (items.length === 0) throw new Error(`Kagi ${category} feed returned no items`);
  return items;
}

async function fetchCategoryWithRetry(category) {
  let lastError;
  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt += 1) {
    try {
      return await fetchCategory(category);
    } catch (error) {
      lastError = error;
      if (attempt < FETCH_ATTEMPTS) {
        console.warn(
          `[podcast/news] Kagi ${category} fetch failed (attempt ${attempt}/${FETCH_ATTEMPTS}): ${error?.message || error}`,
        );
        await sleep(backoffDelay(attempt));
      }
    }
  }
  const message = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Kagi ${category} failed after ${FETCH_ATTEMPTS} attempts: ${message}`);
}

export async function fetchPodcastNews() {
  return Promise.all(
    KAGI_CATEGORIES.map(async (category) => ({
      category,
      items: await fetchCategoryWithRetry(category),
    })),
  );
}
