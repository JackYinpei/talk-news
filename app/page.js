import { auth, signOut } from "@/app/auth";
import HomePageClient from '@/app/components/HomePageClient'

export default async function Home() {
  const session = await auth();

  async function signOutAction() {
    'use server'
    await signOut()
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "LingDaily",
    "description": "Chat with AI to learn English through current news conversations. AI-powered English learning platform for vocabulary building and speaking practice.",
    "url": "https://talknews.ai",
    "applicationCategory": "EducationalApplication",
    "operatingSystem": "Web",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
    "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.9", "reviewCount": "1000" },
    "keywords": "chat with ai to learn english, ai english tutor, english learning, ai conversation, speak english practice",
    "inLanguage": "en",
    "potentialAction": { "@type": "UseAction", "target": "https://talknews.ai/talk" }
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <HomePageClient signedIn={!!session?.user} signOutAction={signOutAction} />
    </>
  );
}
