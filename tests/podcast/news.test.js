import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchPodcastNews } from "@/app/lib/podcast/news";

function rssBody(category, count = 4) {
  const items = Array.from({ length: count }, (_, i) => `
    <item>
      <title>${category} story ${i + 1}</title>
      <link>https://example.com/${category}/${i + 1}</link>
      <description>Details about ${category} story ${i + 1}.</description>
      <pubDate>Tue, 29 Jul 2026 05:00:00 GMT</pubDate>
    </item>`).join("");
  return `<?xml version="1.0"?><rss><channel>${items}</channel></rss>`;
}

function okResponse(xml) {
  return { ok: true, text: async () => xml };
}

function categoryOf(url) {
  return String(url).match(/\/(\w+)\.xml$/)[1];
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("podcast news fetching", () => {
  it("returns all three categories capped at three items each", async () => {
    const fetchMock = vi.fn(async (url) => okResponse(rssBody(categoryOf(url))));
    vi.stubGlobal("fetch", fetchMock);

    const news = await fetchPodcastNews();

    expect(news.map((entry) => entry.category)).toEqual(["world", "tech", "business"]);
    for (const entry of news) {
      expect(entry.items).toHaveLength(3);
      expect(entry.items[0].title).toBe(`${entry.category} story 1`);
    }
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("retries a category through transient upstream failures", async () => {
    vi.useFakeTimers();
    try {
      let worldCalls = 0;
      const fetchMock = vi.fn(async (url) => {
        const category = categoryOf(url);
        if (category === "world" && (worldCalls += 1) < 3) {
          return { ok: false, status: 503 };
        }
        return okResponse(rssBody(category));
      });
      vi.stubGlobal("fetch", fetchMock);

      const promise = fetchPodcastNews();
      await vi.runAllTimersAsync();
      const news = await promise;

      expect(news.find((entry) => entry.category === "world").items).toHaveLength(3);
      expect(worldCalls).toBe(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it("treats an empty feed as a failure and retries it", async () => {
    vi.useFakeTimers();
    try {
      let worldCalls = 0;
      const fetchMock = vi.fn(async (url) => {
        const category = categoryOf(url);
        if (category === "world" && (worldCalls += 1) === 1) {
          return okResponse("<?xml version=\"1.0\"?><rss><channel></channel></rss>");
        }
        return okResponse(rssBody(category));
      });
      vi.stubGlobal("fetch", fetchMock);

      const promise = fetchPodcastNews();
      await vi.runAllTimersAsync();
      const news = await promise;

      expect(news.find((entry) => entry.category === "world").items).toHaveLength(3);
      expect(worldCalls).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("fails the run when one category stays down, instead of inventing news", async () => {
    vi.useFakeTimers();
    try {
      const fetchMock = vi.fn(async (url) => {
        if (categoryOf(url) === "world") return { ok: false, status: 503 };
        return okResponse(rssBody(categoryOf(url)));
      });
      vi.stubGlobal("fetch", fetchMock);

      const promise = fetchPodcastNews();
      const expectation = expect(promise).rejects.toThrow(/Kagi world failed after 4 attempts/);
      await vi.runAllTimersAsync();
      await expectation;

      const worldCalls = fetchMock.mock.calls.filter(([url]) => categoryOf(url) === "world");
      expect(worldCalls).toHaveLength(4);
    } finally {
      vi.useRealTimers();
    }
  });
});
