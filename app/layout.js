import "./globals.css";

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

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
