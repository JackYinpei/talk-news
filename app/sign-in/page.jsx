"use client"

import { useTransition } from "react"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { LogIn, MessageCircle, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function SignIn() {
  const [isPending, startTransition] = useTransition()

  const handleGoogleSignIn = () => {
    startTransition(() => {
      void signIn("google", { callbackUrl: "/talk" })
    })
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center gap-10 px-4 py-16 text-white md:flex-row md:justify-between">
        <div className="max-w-md space-y-6 text-center md:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/80">
            <MessageCircle className="size-3.5" />
            <span>TalkNews</span>
          </div>
          <h1 className="text-4xl font-semibold md:text-5xl">
            Sign in to continue your AI conversation practice
          </h1>
          <p className="text-base text-white/70 md:text-lg">
            Access personalised lessons, pick up where you left off, and keep track of the new vocabulary you discover while chatting about the latest news.
          </p>
          <div className="flex flex-col gap-4 text-left text-sm text-white/60">
            <div className="flex items-start gap-3">
              <span className="mt-1.5 size-1.5 rounded-full bg-emerald-400" />
              <span>Sync your conversation history and vocabulary highlights across devices.</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-1.5 size-1.5 rounded-full bg-sky-400" />
              <span>Receive tailored speaking tips based on your recent sessions.</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-1.5 size-1.5 rounded-full bg-fuchsia-400" />
              <span>Stay updated with curated news topics that match your learning goals.</span>
            </div>
          </div>
        </div>

        <Card className="w-full max-w-md bg-white/5 border-white/10 text-white backdrop-blur">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-2xl font-semibold">Welcome back</CardTitle>
            <CardDescription className="text-white/70">
              Sign in with your Google account to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button
              onClick={handleGoogleSignIn}
              className="w-full bg-white text-black hover:bg-white/90"
              size="lg"
              disabled={isPending}
            >
              <GoogleLogo />
              <span>{isPending ? "Redirecting…" : "Continue with Google"}</span>
            </Button>
            <div className="flex items-center justify-center gap-2 text-sm text-white/60">
              <ShieldCheck className="size-4" />
              <span>Your email is only used to authenticate with Google.</span>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-center gap-3 text-sm text-white/60">
            <p>
              Problems signing in?
              <Link href="mailto:hello@talknews.ai" className="ml-1 text-white underline">
                Contact support
              </Link>
            </p>
            <Button variant="ghost" asChild className="text-white/70 hover:text-white">
              <Link href="/">
                <LogIn className="mr-2 size-4" />
                Back to home
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

function GoogleLogo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M21.6 12.2273C21.6 11.5182 21.5364 10.8364 21.4182 10.1818H12V14.05H17.2364C17.0091 15.2682 16.3091 16.3 15.2773 16.9818V19.7182H18.4091C20.2727 18.0182 21.6 15.4 21.6 12.2273Z"
        fill="#4285F4"
      />
      <path
        d="M12 22C14.97 22 17.4091 21.0182 18.4091 19.7182L15.2773 16.9818C14.7364 17.3418 13.9464 17.5681 13 17.5681C10.1091 17.5681 7.67727 15.5545 6.80909 12.9818H3.57727V15.7954C4.56818 18.1818 8.02727 22 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.80909 12.9818C6.58636 12.3218 6.45454 11.6182 6.45454 10.9C6.45454 10.1818 6.58636 9.47818 6.80909 8.81818V6.00455H3.57727C2.95 7.28727 2.6 8.74727 2.6 10.3C2.6 11.8527 2.95 13.3127 3.57727 14.5954L6.80909 12.9818Z"
        fill="#FBBC05"
      />
      <path
        d="M12 4.43182C13.0818 4.43182 14.0591 4.80454 14.8455 5.55454L18.4636 1.93636C17.4045 0.968182 14.97 0 12 0C8.02727 0 4.56818 3.81818 3.57727 6.00455L6.80909 8.81818C7.67727 6.24545 10.1091 4.43182 12 4.43182Z"
        fill="#EA4335"
      />
    </svg>
  )
}
