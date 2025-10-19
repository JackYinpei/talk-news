const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

export async function POST(req) {
  try {
    const { email, password, name } = await req.json()
    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        { status: 400 }
      )
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase env configuration" }),
        { status: 500 }
      )
    }

    let res
    let data

    // Fallback: public signup via anon key (will require email confirmation unless disabled)
    const url = `${supabaseUrl}/auth/v1/signup`
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        email,
        password,
        data: name ? { name } : undefined,
      }),
      cache: "no-store",
    })
    data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const message = data?.msg || data?.error_description || data?.error || "Registration failed"
      return new Response(JSON.stringify({ error: message }), { status: 400 })
    }

    return new Response(
      JSON.stringify({ ok: true, user: data ?? null }),
      { status: 200 }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err?.message || "Unexpected error" }),
      { status: 500 }
    )
  }
}
