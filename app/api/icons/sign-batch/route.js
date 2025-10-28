import { auth } from "@/app/auth"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const bucketName = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || process.env.SUPABASE_BUCKET || 'icons'

export const runtime = 'nodejs'

function sanitizeKey(word) {
  const raw = String(word || "").trim()
  const safe = raw
    .toLowerCase()
    .normalize("NFKC")
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}\-_.]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^[-_.]+|[-_.]+$/g, "")
  const base = safe || "icon"
  return `${base}.png`
}

async function headObjectExistsWithAuth(key) {
  const url = `${supabaseUrl}/storage/v1/object/${bucketName}/${encodeURI(key)}`
  const res = await fetch(url, {
    method: "HEAD",
    headers: {
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      apikey: supabaseServiceRoleKey || supabaseAnonKey,
    },
    cache: "no-store",
  })
  return res.ok
}

async function signObjectUrl(key, expiresIn = 60 * 60 * 24 * 7) {
  const url = `${supabaseUrl}/storage/v1/object/sign/${bucketName}/${encodeURI(key)}`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      apikey: supabaseServiceRoleKey || supabaseAnonKey,
    },
    body: JSON.stringify({ expiresIn }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || !json?.signedURL) return null
  return `${supabaseUrl}/storage/v1${json.signedURL}`
}

export async function POST(req) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing Supabase env configuration" }), { status: 500 })
    }

    const body = await req.json().catch(() => ({}))
    const words = Array.isArray(body?.words) ? body.words : []
    if (words.length === 0) {
      return new Response(JSON.stringify({ error: "'words' array is required" }), { status: 400 })
    }

    // Deduplicate preserving order
    const seen = new Set()
    const uniqueWords = []
    for (const w of words) {
      const s = String(w || '').trim()
      if (!s || seen.has(s)) continue
      seen.add(s)
      uniqueWords.push(s)
    }

    const results = {}
    for (const w of uniqueWords) {
      const key = sanitizeKey(w)
      const exists = await headObjectExistsWithAuth(key)
      if (!exists) {
        results[w] = { exists: false, url: null, key }
        continue
      }
      const url = await signObjectUrl(key)
      results[w] = { exists: Boolean(url), url, key }
    }

    return new Response(JSON.stringify({ ok: true, results }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err?.message || 'Unexpected error' }), { status: 500 })
  }
}

