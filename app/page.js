import Link from "next/link";
import { auth, signOut } from "@/app/auth";
import { AuthError } from "next-auth";
import HomePageClient from "@/app/components/HomePageClient";

export const revalidate = 3600;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lingdaily.yasobi.xyz';

const marketingHighlights = [
  {
    heading: "AI tutor that keeps you talking",
    body: "LingDaily guides you through fluent, two-way conversation practice so you can think in English instead of translating sentence by sentence.",
  },
  {
    heading: "News-fueled vocabulary gains",
    body: "We pair every session with a current news brief, helping you collect fresh vocabulary, idioms, and cultural references anchored to real events.",
  },
  {
    heading: "Actionable learning records",
    body: "Each interaction creates feedback, summaries, and public conversation snippets in the Longtail Library so you can revisit what you have learned.",
  },
];

const internalLinkTargets = [
  {
    href: "/talk",
    label: "AI Conversation Lab",
    description: "Start a guided conversation about today’s headlines and receive instant pronunciation and vocabulary feedback.",
  },
  {
    href: "/longtail",
    label: "Longtail Library",
    description: "Browse open practice transcripts to see how other learners discuss global news topics in natural English.",
  },
];

function HomePageServerContent({ signedIn }) {
  return (
    <article className="bg-background text-foreground border-b border-border">
      <div className="container mx-auto px-4 py-12 lg:py-16">
        <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">LingDaily</p>
        <h1 className="mt-3 text-3xl font-bold leading-tight md:text-5xl">
          Learn English faster by chatting about real news stories
        </h1>
        <p className="mt-4 max-w-3xl text-lg text-muted-foreground leading-relaxed">
          LingDaily combines AI conversation, daily news briefings, and bilingual hints so you can
          practice speaking anywhere. Stay curious, ask follow-up questions, and let the tutor keep
          the dialogue flowing while you collect phrases that matter.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Link
            href="/talk"
            className="inline-flex items-center rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow hover:bg-primary/90"
          >
            Practice with AI now
          </Link>
          <Link
            href="/longtail"
            className="inline-flex items-center rounded-full border border-border px-6 py-3 text-base font-semibold text-foreground hover:border-foreground/70"
          >
            Read public transcripts
          </Link>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {signedIn
            ? "Welcome back! Continue your saved sessions from any device."
            : "No account required to explore our AI tutor—sign up free when you are ready."}
        </p>
      </div>

      <div className="container mx-auto grid gap-6 px-4 pb-12 md:grid-cols-3">
        {marketingHighlights.map((item) => (
          <section key={item.heading} className="rounded-3xl border border-border bg-card/60 p-6">
            <h2 className="text-xl font-semibold">{item.heading}</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">{item.body}</p>
          </section>
        ))}
      </div>

      <div className="container mx-auto px-4 pb-12">
        <h2 className="text-2xl font-semibold">Explore LingDaily’s open resources</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Search engines and human learners alike can crawl these pages without logging in, making it
          easy to discover deeper content straight from our homepage.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {internalLinkTargets.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-3xl border border-border bg-card/50 p-5 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Internal link</div>
              <span className="mt-2 block text-xl font-semibold">{item.label}</span>
              <p className="mt-2 text-muted-foreground">{item.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </article>
  );
}

export default async function Home() {
  let session = null;
  try {
    session = await auth();
  } catch (error) {
    if (error instanceof AuthError && error.type === "JWTSessionError") {
      console.warn("auth() failed to decode session token, ignoring cookie", error);
      session = null;
    } else {
      throw error;
    }
  }

  async function signOutAction() {
    'use server'
    await signOut()
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "LingDaily",
    "description": "Chat with AI to learn English through current news conversations. AI-powered English learning platform for vocabulary building and speaking practice.",
    "url": siteUrl,
    "applicationCategory": "EducationalApplication",
    "operatingSystem": "Web",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
    "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.9", "reviewCount": "1000" },
    "keywords": "chat with ai to learn english, ai english tutor, english learning, ai conversation, speak english practice",
    "inLanguage": "en",
    "potentialAction": { "@type": "UseAction", "target": `${siteUrl}/talk` }
  };

  return (
    <>
      <HomePageServerContent signedIn={!!session?.user} />
      <noscript>
        <section className="mx-auto my-6 max-w-3xl rounded-2xl border border-border bg-card/60 p-4 text-sm leading-relaxed text-foreground">
          <strong>LingDaily works without JavaScript.</strong> Read curated news summaries, study
          vocabulary from our Longtail Library, and start a guided English conversation at{" "}
          <Link href="/talk">lingdaily.yasobi.xyz/talk</Link>. You can always review open transcripts
          at <Link href="/longtail">lingdaily.yasobi.xyz/longtail</Link> for additional practice
          ideas.
        </section>
      </noscript>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <HomePageClient signedIn={!!session?.user} signOutAction={signOutAction} />
    </>
  );
}
