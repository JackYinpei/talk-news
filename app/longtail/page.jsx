import Link from "next/link";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseSchema = process.env.SUPABASE_SCHEMA || "public";

export const metadata = {
  title: "LingDaily Longtail Library | AI English Conversations from Real News",
  description:
    "Explore LingDaily's curated archive of AI-facilitated English practice sessions based on trending news topics. Discover real learner conversations and jump into the stories that interest you.",
};

async function fetchLatestConversations(limit = 12) {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.warn("Missing Supabase configuration for longtail listing");
    return [];
  }

  const params = new URLSearchParams();
  params.set("select", "id,news_key,news_title,news,summary,user_id,updated_at");
  params.set("order", "updated_at.desc");
  params.set("limit", String(limit));

  const res = await fetch(`${supabaseUrl}/rest/v1/chat_history?${params.toString()}`, {
    method: "GET",
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      "Content-Profile": supabaseSchema,
      Accept: "application/json",
      "Cache-Control": "no-store",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("Failed to load chat history list", await res.text());
    return [];
  }

  return res.json();
}

const formatDate = (input) => {
  if (!input) return "Recently";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(input));
};

const getSummaryExcerpt = (row) => {
  const base = row.summary || row.news?.description || row.news?.content;
  if (!base) return "Real learner conversation powered by LingDaily's AI English tutor.";
  return base.length > 180 ? `${base.slice(0, 177)}...` : base;
};

const topicLabel = (row) =>
  row.news?.category ||
  row.news?.section ||
  "AI English Practice";

export default async function LongtailPage() {
  const conversations = await fetchLatestConversations();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="w-full border-b border-border bg-card">
        <div className="container mx-auto px-4 py-16 lg:py-20">
          <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">
            LingDaily Longtail
          </p>
          <h1 className="mt-4 text-3xl font-bold leading-tight md:text-5xl">
            自然语言学习，源于真实新闻
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            我们将真实新闻与 AI 对话结合，沉淀成一篇篇可阅读的英语练习实录。
            挑一个你感兴趣的话题，看看其他学习者如何表达，再继续你的练习。
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 md:py-16">
        {conversations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center">
            <h2 className="text-xl font-semibold">还没有可展示的对话</h2>
            <p className="mt-2 text-muted-foreground">
              和 AI 练习一段英语，我们会在这里展示热门的学习主题。
            </p>
            <Link
              href="/talk"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              立刻开始对话
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {conversations.map((item) => {
              const href = `/longtail/${encodeURIComponent(item.news_key)}/${encodeURIComponent(
                item.user_id,
              )}`;
              return (
                <article
                  key={`${item.news_key}-${item.user_id}`}
                  className="flex h-full flex-col rounded-3xl border border-border bg-card/70 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="flex items-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {topicLabel(item)}
                  </div>
                  <h2 className="mt-3 text-xl font-semibold leading-tight">
                    {item.news_title || item.news?.title || item.news_key}
                  </h2>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {getSummaryExcerpt(item)}
                  </p>
                  <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="rounded-full border border-border px-3 py-1">
                      Learner {item.user_id.slice(0, 6)}
                    </span>
                    <span>{formatDate(item.updated_at)}</span>
                  </div>
                  <Link
                    href={href}
                    className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                  >
                    阅读完整对话
                    <span aria-hidden="true">→</span>
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
