import { auth } from "@/app/auth"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

export async function POST(req) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase env configuration" }),
        { status: 500 }
      )
    }

    const session = await auth()
    if (!session?.user?.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const { items, context, timestamp, userMessage } = body || {}

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "'items' array is required" }),
        { status: 400 }
      )
    }

    // Build the row to insert. Table expected: unfamiliar_english
    const row = {
      user_id: session.user.id,
      items,
      context: context ?? null,
      timestamp: timestamp ?? new Date().toISOString(),
      user_message: userMessage ?? null,
    }

    const url = `${supabaseUrl}/rest/v1/unfamiliar_english`
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
        // If available, use the user's Supabase access token for RLS; otherwise fallback to anon
        Authorization: `Bearer ${session.supabaseAccessToken || supabaseAnonKey}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify(row),
      cache: "no-store",
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: data?.message || data?.hint || "Failed to insert", details: data }),
        { status: 400 }
      )
    }

    return new Response(
      JSON.stringify({ ok: true, data }),
      { status: 200 }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err?.message || "Unexpected error" }),
      { status: 500 }
    )
  }
}

