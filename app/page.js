import Link from "next/link";
import { auth, signOut } from "@/app/auth";
import { AuthError } from "next-auth";
import HomePageClient from "@/app/components/HomePageClient";
import { headers } from "next/headers";

export const revalidate = 3600;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lingdaily.yasobi.xyz';

function detectPreferredLocale(acceptLanguageHeader = "") {
  const parts = acceptLanguageHeader
    .split(",")
    .map((part) => part.trim().split(";")[0].toLowerCase())
    .filter(Boolean);

  for (const code of parts) {
    if (code.startsWith("zh")) return "zh";
    if (code.startsWith("ja")) return "ja";
  }

  return "en";
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

  const headersList = await headers();
  const acceptLanguageHeader = headersList.get("accept-language") || "";
  const locale = detectPreferredLocale(acceptLanguageHeader);

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
      <HomePageClient signedIn={!!session?.user} signOutAction={signOutAction} locale={locale} />
    </>
  );
}
