import "./globals.css";
import { SessionProvider } from "next-auth/react"
import { headers } from 'next/headers'
import { LanguageProvider } from '@/app/contexts/LanguageContext'
import { ThemeProvider } from '@/app/contexts/ThemeContext'

export const metadata = {
  title: "TalkNews - Chat with AI to Learn English | AI English Tutor",
  description: "Master English through AI-powered conversations about current news. Practice speaking, improve vocabulary, and gain confidence with our intelligent English learning platform. Chat with AI to learn English naturally and effectively.",
  keywords: ["chat with ai to learn english", "ai english tutor", "english learning", "ai conversation", "speak english practice", "english vocabulary", "news english", "ai language learning", "english conversation practice", "learn english online"],
  authors: [{ name: "TalkNews" }],
  creator: "TalkNews",
  publisher: "TalkNews",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://talknews.ai'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "TalkNews - Chat with AI to Learn English",
    description: "Master English through AI-powered conversations about current news. Practice speaking, improve vocabulary, and gain confidence naturally.",
    url: 'https://talknews.ai',
    siteName: 'TalkNews',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'TalkNews - Chat with AI to Learn English',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "TalkNews - Chat with AI to Learn English",
    description: "Master English through AI-powered conversations about current news. Practice speaking and improve vocabulary naturally.",
    images: ['/og-image.jpg'],
    creator: '@talknews',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-site-verification',
  },
};

export default async function RootLayout({ children }) {
  const h = await headers()
  const acceptLanguage = h.get('accept-language') || ''
  const themeScript = `(()=>{try{var s=localStorage.getItem('theme');var m=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;var t=s==='light'?'light':s==='dark'?'dark':(m?'dark':'light');var d=document.documentElement;d.classList.toggle('dark',t==='dark');}catch(e){document.documentElement.classList.add('dark');}})()`
  return (
    <html lang="en">
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <SessionProvider>
          <LanguageProvider initialAcceptLanguage={acceptLanguage}>
            <ThemeProvider>
              {children}
            </ThemeProvider>
          </LanguageProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
