import { auth } from "@/app/auth"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseSchema = process.env.SUPABASE_SCHEMA || 'public'

// Table suggestion: user_preferences
// Columns: user_id (text/uuid, PK or unique), native_language_code, native_language_label,
//          learning_language_code, learning_language_label, updated_at (timestamp)

export async function GET() {
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

    const url = new URL(`${supabaseUrl}/rest/v1/user_preferences`)
    url.searchParams.set('user_id', `eq.${session.user.id}`)
    url.searchParams.set('select', 'user_id,native_language_code,native_language_label,learning_language_code,learning_language_label,updated_at')
    url.searchParams.set('limit', '1')

    const bearer = supabaseServiceRoleKey || session.supabaseAccessToken || supabaseAnonKey
    const apiKeyHeader = supabaseServiceRoleKey || supabaseAnonKey

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        apikey: apiKeyHeader,
        Authorization: `Bearer ${bearer}`,
        'Content-Profile': supabaseSchema,
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
      },
      cache: 'no-store',
    })

    const text = await res.text()
    let data
    try { data = text ? JSON.parse(text) : [] } catch { data = { raw: text } }

    if (!res.ok) {
      // If table not found or other issues, surface but keep simple on client
      return new Response(
        JSON.stringify({ error: data?.message || data?.hint || data?.raw || 'Failed to fetch', status: res.status }),
        { status: res.status || 400 }
      )
    }

    const item = Array.isArray(data) && data.length > 0 ? data[0] : null
    return new Response(JSON.stringify({ ok: true, data: item }), { status: 200 })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err?.message || 'Unexpected error' }),
      { status: 500 }
    )
  }
}

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
    const native = body?.native || {}
    const learning = body?.learning || {}

    const row = {
      user_id: session.user.id,
      native_language_code: native?.code || null,
      native_language_label: native?.label || null,
      learning_language_code: learning?.code || null,
      learning_language_label: learning?.label || null,
      updated_at: new Date().toISOString(),
    }

    const bearer = supabaseServiceRoleKey || session.supabaseAccessToken || supabaseAnonKey
    const apiKeyHeader = supabaseServiceRoleKey || supabaseAnonKey

    // First check if a row exists
    const checkUrl = new URL(`${supabaseUrl}/rest/v1/user_preferences`)
    checkUrl.searchParams.set('user_id', `eq.${session.user.id}`)
    checkUrl.searchParams.set('select', 'user_id')
    checkUrl.searchParams.set('limit', '1')

    const checkRes = await fetch(checkUrl.toString(), {
      method: 'GET',
      headers: {
        apikey: apiKeyHeader,
        Authorization: `Bearer ${bearer}`,
        'Content-Profile': supabaseSchema,
        'Accept': 'application/json',
      },
      cache: 'no-store',
    })
    const checkText = await checkRes.text()
    let checkData
    try { checkData = checkText ? JSON.parse(checkText) : [] } catch { checkData = [] }
    const exists = Array.isArray(checkData) && checkData.length > 0

    let res, txt
    if (exists) {
      // Update existing row
      const patchUrl = new URL(`${supabaseUrl}/rest/v1/user_preferences`)
      patchUrl.searchParams.set('user_id', `eq.${session.user.id}`)
      res = await fetch(patchUrl.toString(), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          apikey: apiKeyHeader,
          Authorization: `Bearer ${bearer}`,
          'Content-Profile': supabaseSchema,
          Prefer: 'return=representation',
        },
        body: JSON.stringify(row),
      })
      txt = await res.text()
    } else {
      // Insert new row
      res = await fetch(`${supabaseUrl}/rest/v1/user_preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: apiKeyHeader,
          Authorization: `Bearer ${bearer}`,
          'Content-Profile': supabaseSchema,
          Prefer: 'return=representation',
        },
        body: JSON.stringify(row),
      })
      txt = await res.text()
    }

    let data
    try { data = txt ? JSON.parse(txt) : {} } catch { data = { raw: txt } }

    if (!res.ok) {
      const message = data?.message || data?.hint || data?.raw || data?.error || 'Failed to save'
      return new Response(
        JSON.stringify({ error: message, status: res.status, details: data }),
        { status: res.status || 400 }
      )
    }

    // If Supabase returns an array for representation, normalize to single object
    const normalized = Array.isArray(data) ? data[0] : data
    return new Response(JSON.stringify({ ok: true, data: normalized }), { status: 200 })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err?.message || 'Unexpected error' }),
      { status: 500 }
    )
  }
}

