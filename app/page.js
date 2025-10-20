import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Users, Globe, Zap, CheckCircle, Star } from "lucide-react";
import { auth, signOut } from "@/app/auth";
import StartLearningWithLanguage from "@/app/components/StartLearningWithLanguage";

export default async function Home() {
  const session = await auth();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "TalkNews",
    "description": "Chat with AI to learn English through current news conversations. AI-powered English learning platform for vocabulary building and speaking practice.",
    "url": "https://talknews.ai",
    "applicationCategory": "EducationalApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": "1000"
    },
    "keywords": "chat with ai to learn english, ai english tutor, english learning, ai conversation, speak english practice",
    "inLanguage": "en",
    "potentialAction": {
      "@type": "UseAction",
      "target": "https://talknews.ai/talk"
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-zinc-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-8 w-8 text-white" />
              <span className="text-2xl font-bold">TalkNews</span>
            </div>
            <nav className="hidden md:flex items-center space-x-6">
              <Link href="#features" className="text-zinc-300 hover:text-white transition-colors">
                Features
              </Link>
              <Link href="#how-it-works" className="text-zinc-300 hover:text-white transition-colors">
                How it Works
              </Link>
              <Link href="#testimonials" className="text-zinc-300 hover:text-white transition-colors">
                Reviews
              </Link>
              <StartLearningWithLanguage />
              {session?.user ? (
                <form action={async () => { 'use server'; await signOut(); }}>
                  <Button variant="outline" className="bg-white text-black border-zinc-700 hover:bg-zinc-800 hover:text-white font-semibold">
                    SignOut
                  </Button>
                </form>
              ) : (
                <Link href="/sign-in">
                  <Button variant="outline" className="bg-white text-black border-zinc-700 hover:bg-zinc-800 hover:text-white font-semibold">
                    SignIn
                  </Button>
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <Badge className="mb-6 bg-zinc-800 text-white border-zinc-700">
            🚀 AI-Powered English Learning
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Chat with AI to
            <span className="text-transparent bg-gradient-to-r from-white to-zinc-400 bg-clip-text"> Learn English</span>
          </h1>
          <p className="text-xl md:text-2xl text-zinc-300 mb-8 leading-relaxed">
            Master English through real-time conversations about current news. Practice speaking, improve vocabulary, and gain confidence with our AI English tutor.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/talk">
              <Button size="lg" className="bg-white text-black hover:bg-zinc-800 hover:text-white font-semibold px-8 py-4 text-lg">
                Start Free Conversation
                <MessageCircle className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="bg-white text-black border-zinc-700 hover:bg-zinc-800 hover:text-white px-8 py-4 text-lg">
              Watch Demo
              <Zap className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Why Choose TalkNews?</h2>
          <p className="text-xl text-zinc-300 max-w-2xl mx-auto">
            Learn English naturally through AI conversations about real-world topics
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
            <CardContent className="p-6">
              <MessageCircle className="h-12 w-12 text-white mb-4" />
              <h3 className="text-2xl font-semibold mb-4 text-white">Real-Time Conversations</h3>
              <p className="text-zinc-300">
                Practice speaking English with AI that understands context and provides instant feedback on your pronunciation and grammar.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
            <CardContent className="p-6">
              <Globe className="h-12 w-12 text-white mb-4" />
              <h3 className="text-2xl font-semibold mb-4 text-white">Current News Topics</h3>
              <p className="text-zinc-300">
                Stay informed while learning. Discuss trending news stories to build vocabulary and cultural understanding.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
            <CardContent className="p-6">
              <Users className="h-12 w-12 text-white mb-4" />
              <h3 className="text-2xl font-semibold mb-4 text-white">Personalized Learning</h3>
              <p className="text-zinc-300">
                AI adapts to your learning level and interests, providing customized conversations that match your progress.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="bg-zinc-950 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-zinc-300 max-w-2xl mx-auto">
              Three simple steps to start improving your English today
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-white text-black rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                1
              </div>
              <h3 className="text-2xl font-semibold mb-4">Choose a News Topic</h3>
              <p className="text-zinc-300">
                Select from current news stories that interest you, from technology to global events.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-white text-black rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                2
              </div>
              <h3 className="text-2xl font-semibold mb-4">Start Talking</h3>
              <p className="text-zinc-300">
                Engage in natural conversation with our AI tutor about the topic you chose.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-white text-black rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                3
              </div>
              <h3 className="text-2xl font-semibold mb-4">Learn & Improve</h3>
              <p className="text-zinc-300">
                Receive real-time feedback, learn new vocabulary, and track your progress.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Perfect for English Learners</h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-6 w-6 text-green-400" />
                <span className="text-lg">Practice speaking without judgment</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-6 w-6 text-green-400" />
                <span className="text-lg">Learn vocabulary in context</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-6 w-6 text-green-400" />
                <span className="text-lg">Improve pronunciation with AI feedback</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-6 w-6 text-green-400" />
                <span className="text-lg">Stay updated with global news</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-6 w-6 text-green-400" />
                <span className="text-lg">Learn at your own pace, 24/7</span>
              </div>
            </div>
          </div>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-8">
              <div className="flex items-center mb-4">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-current" />
                  ))}
                </div>
                <span className="ml-2 text-zinc-300">4.9/5 from 1000+ learners</span>
              </div>
              <blockquote className="text-lg text-zinc-200 mb-4">
                &ldquo;TalkNews helped me improve my English speaking skills faster than any other method. The AI conversations feel natural and the news topics keep me engaged.&rdquo;
              </blockquote>
              <cite className="text-zinc-400">— Sarah K., International Student</cite>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-zinc-900 to-black py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Master English?</h2>
          <p className="text-xl text-zinc-300 mb-8 max-w-2xl mx-auto">
            Join thousands of learners who are improving their English through AI-powered conversations
          </p>
          <Link href="/talk">
            <Button size="lg" className="bg-white text-black hover:bg-zinc-200 font-semibold px-8 py-4 text-lg">
              Start Your Free Conversation
              <MessageCircle className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <p className="text-sm text-zinc-400 mt-4">No credit card required • Start learning immediately</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-black">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <MessageCircle className="h-6 w-6" />
                <span className="text-xl font-bold">TalkNews</span>
              </div>
              <p className="text-zinc-400">
                AI-powered English learning through news conversations
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Features</h4>
              <ul className="space-y-2 text-zinc-400">
                <li><Link href="#" className="hover:text-white transition-colors">AI Conversations</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">News Topics</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Progress Tracking</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Learning</h4>
              <ul className="space-y-2 text-zinc-400">
                <li><Link href="/talk" className="hover:text-white transition-colors">Start Learning</Link></li>
                <li><Link href="/history" className="hover:text-white transition-colors">Conversation History</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Tips & Guides</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-zinc-400">
                <li><Link href="#" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Contact Us</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-zinc-800 mt-12 pt-8 text-center text-zinc-400">
            <p>&copy; 2024 TalkNews. All rights reserved. Chat with AI to learn English.</p>
          </div>
        </div>
      </footer>
      </div>
    </>
  );
}
