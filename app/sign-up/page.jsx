"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LogIn, UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function SignUp() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const handleRegister = async (e) => {
    e.preventDefault()
    setError("")
    setMessage("")
    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data?.error || "Registration failed")
          return
        }
        setMessage("Registration successful. Please sign in.")
        setTimeout(() => router.push("/sign-in"), 800)
      } catch (err) {
        setError(err?.message || "Unexpected error")
      }
    })
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center gap-10 px-4 py-16 text-white md:flex-row md:justify-between">
        <div className="max-w-md space-y-6 text-center md:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/80">
            <UserPlus className="size-3.5" />
            <span>Create Account</span>
          </div>
          <h1 className="text-4xl font-semibold md:text-5xl">Join LingDaily</h1>
          <p className="text-base text-white/70 md:text-lg">
            Register with your email and start practicing English with AI.
          </p>
        </div>

        <Card className="w-full max-w-md bg-white/5 border-white/10 text-white backdrop-blur">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-2xl font-semibold">Create your account</CardTitle>
            <CardDescription className="text-white/70">
              Use your email and a secure password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm">Name (optional)</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-white/20 bg-transparent px-3 py-2 outline-none focus:border-white/50"
                  placeholder="Your display name"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm">Email</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-white/20 bg-transparent px-3 py-2 outline-none focus:border-white/50"
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm">Password</label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-white/20 bg-transparent px-3 py-2 outline-none focus:border-white/50"
                  placeholder="••••••••"
                />
              </div>
              {error ? (
                <p className="text-sm text-red-400">{error}</p>
              ) : null}
              {message ? (
                <p className="text-sm text-emerald-400">{message}</p>
              ) : null}
              <Button type="submit" className="w-full bg-white text-black hover:bg-white/90" size="lg" disabled={isPending}>
                <UserPlus className="mr-2 size-4" />
                <span>{isPending ? "Creating…" : "Create account"}</span>
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex items-center justify-between text-sm text-white/70">
            <Link href="/sign-in" className="hover:underline flex items-center gap-2">
              <LogIn className="size-4" />
              Back to sign in
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
