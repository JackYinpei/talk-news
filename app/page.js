import { auth, signOut } from "@/app/auth";
import { AuthError } from "next-auth";
import HomePageClient from '@/app/components/HomePageClient'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lingdaily.yasobi.xyz';

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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <HomePageClient signedIn={!!session?.user} signOutAction={signOutAction} />
    </>
  );
}
