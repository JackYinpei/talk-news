import SignInClient from "./sign-in-client"

export default function SignInPage() {
  const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)
  return <SignInClient googleEnabled={googleEnabled} />
}
