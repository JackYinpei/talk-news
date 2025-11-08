import Link from "next/link";
import { notFound } from "next/navigation";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseSchema = process.env.SUPABASE_SCHEMA || "public";

export const dynamic = "force-dynamic";

const fetchConversation = async (newsKeyParam, userId, { useCache = false } = {}) => {
  if (!supabaseUrl || !supabaseServiceRoleKey || !newsKeyParam || !userId) return null;
  const newsKey = decodeURIComponent(newsKeyParam);
  const resolvedUserId = decodeURIComponent(userId);
  const params = new URLSearchParams();
  params.set(
    "select",
    "id,news_key,news_title,news,summary,history,user_id,updated_at,created_at",
  );
  params.set("news_key", `eq.${newsKey}`);
  params.set("user_id", `eq.${resolvedUserId}`);
  params.set("limit", "1");

  const fetchOptions = {
    method: "GET",
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      "Content-Profile": supabaseSchema,
      Accept: "application/json",
    },
  };

  if (useCache) {
    fetchOptions.next = { revalidate: 600 };
  } else {
    fetchOptions.cache = "no-store";
  }

  const res = await fetch(`${supabaseUrl}/rest/v1/chat_history?${params.toString()}`, fetchOptions);

  if (!res.ok) {
    console.error("Failed to load conversation detail", await res.text());
    return null;
  }

  const data = await res.json();
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
};

const extractTextFromMessage = (message) => {
  const content = Array.isArray(message?.content) ? message.content : [];
  const inputText = content.find((c) => c.type === "input_text");
  const inputAudio = content.find((c) => c.type === "input_audio");
  const outputText = content.find((c) => c.type === "output_text" || c.type === "text");
  const outputAudio = content.find((c) => c.type === "output_audio");
  return (
    inputText?.text ||
    inputAudio?.transcript ||
    outputAudio?.transcript ||
    outputText?.text ||
    ""
  );
};

const formatFullDate = (value) => {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const resolveMessageTimestamp = (message) =>
  message?.created_at || message?.metadata?.createdAt || message?.updated_at || null;

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const { topic, userId } = resolvedParams || {};
  const record = await fetchConversation(topic, userId, { useCache: true });
  if (!record) {
    return {
      title: "LingDaily Conversation Detail",
      description:
        "Read AI-powered English practice sessions inspired by real news topics on LingDaily.",
    };
  }
  const title =
    record.news_title ||
    record.news?.title ||
    `Conversation on ${record.news?.category || "English learning"}`;
  return {
    title: `${title} | LingDaily`,
    description:
      record.summary ||
      record.news?.description ||
      "Review how learners practice English with AI conversations about the news.",
    openGraph: {
      title: `${title} | LingDaily`,
      description:
        record.summary ||
        record.news?.description ||
        "Review how learners practice English with AI conversations about the news.",
      type: "article",
      url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://lingdaily.yasobi.xyz"}/longtail/${encodeURIComponent(record.news_key)}/${record.user_id}`,
    },
  };
}

export default async function LongtailDetailPage({ params }) {
  const resolvedParams = await params;
  const { topic, userId } = resolvedParams || {};
  const record = await fetchConversation(topic, userId);

  if (!record) {
    notFound();
  }

  const news = record.news || {};
  const conversationTitle = record.news_title || news.title || record.news_key;
  const newsSummary = (news.description || news.content || record.summary || "真实新闻话题正在等待你的练习。").trim();
  const displayHistory = Array.isArray(record.history)
    ? record.history.filter((item) => item.role === "user" || item.role === "assistant")
    : [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <p className="text-sm uppercase tracking-[0.4em] text-muted-foreground">
            LingDaily Conversation
          </p>
          <h1 className="mt-4 text-3xl font-bold leading-tight md:text-4xl">
            {conversationTitle}
          </h1>
          <div className="mt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="rounded-full border border-border px-4 py-1">
              Topic · {record.news?.category || "Global News"}
            </span>
            <span>Last updated · {formatFullDate(record.updated_at)}</span>
            <span>Learning partner · {record.user_id.slice(0, 8)}</span>
          </div>
          {news.link && (
            <Link
              href={news.link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              查看原文
              <span aria-hidden="true">↗</span>
            </Link>
          )}
        </div>
      </section>

      <section className="container mx-auto grid gap-8 px-4 py-12 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-6 rounded-3xl border border-border bg-card/40 p-6">
          {displayHistory.length === 0 ? (
            <p className="text-muted-foreground">这段对话暂无公开的消息记录。</p>
          ) : (
            displayHistory.map((message, index) => {
              const text = extractTextFromMessage(message);
              const isAssistant = message.role === "assistant";
              const timestamp = resolveMessageTimestamp(message);
              return (
                <div
                  key={message.itemId || index}
                  className={`flex flex-col gap-2 rounded-2xl border border-border/60 p-4 ${
                    isAssistant ? "bg-background/70" : "bg-primary/5"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                    <span>{isAssistant ? "LingDaily AI" : "Learner"}</span>
                    <span>{timestamp ? formatFullDate(timestamp) : ""}</span>
                  </div>
                  <p className="text-base leading-relaxed whitespace-pre-wrap">{text}</p>
                </div>
              );
            })
          )}
        </div>

        <aside className="space-y-6 rounded-3xl border border-border bg-card/60 p-6">
          <article className="rounded-2xl border border-border bg-background/60 p-4">
            <h2 className="mt-2 text-lg font-semibold">{conversationTitle}</h2>
            <div className="mt-3 max-h-72 overflow-y-auto custom-scroll text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {newsSummary}
            </div>
            {news.link && (
              <Link
                href={news.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
              >
                阅读原文 <span aria-hidden="true">↗</span>
              </Link>
            )}
          </article>

          <div>
            <h2 className="text-lg font-semibold">Conversation Snapshot</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              来自 LingDaily 的真实练习记录，帮助你更快找到对应的长尾主题。
            </p>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div>
              <p className="font-semibold text-foreground">News Topic</p>
              <p>{record.news?.title || record.news_title || record.news_key}</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Learner ID</p>
              <p>{record.user_id}</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Updated</p>
              <p>{formatFullDate(record.updated_at)}</p>
            </div>
          </div>

          <Link
            href="/talk"
            className="inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            我也要练习
          </Link>
          <Link
            href="/longtail"
            className="inline-flex w-full items-center justify-center rounded-full border border-border px-6 py-3 text-sm font-semibold hover:bg-border/20"
          >
            返回列表
          </Link>
        </aside>
      </section>
    </div>
  );
}
