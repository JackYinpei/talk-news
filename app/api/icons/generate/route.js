import { auth } from "@/app/auth"
import { fal } from "@fal-ai/client"

export const runtime = 'nodejs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
// Optional override for public Storage base (some projects serve public objects via a different host)
const supabaseStorageBase = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_URL || process.env.SUPABASE_STORAGE_URL || supabaseUrl + '/storage/v1'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const bucketName = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || process.env.SUPABASE_BUCKET || 'icons'

function buildPrompt(word) {
  const w = String(word || "").trim()
  return `Generate a skeuomorphic, semi-realistic icon representing the concept of “${w}”.\nThe icon should have soft lighting, realistic materials, and subtle shadows, giving it a tactile 3D appearance.\nUse smooth gradients, light reflections, and a sense of depth.\nPlace the main subject at the center of the image with clean, well-defined edges and no background box or frame.\nAvoid text or watermark.\nRender the image with a transparent background (PNG style), suitable for use as an app or logo icon.\n\nStyle: skeuomorphic icon, semi-realistic, 3D lighting, smooth shading, soft gradient, rich color tones, highly detailed, glossy reflection.\nLighting: gentle ambient light with natural highlights and shadows.\nFormat: square aspect ratio, high resolution, transparent background, clean composition.`
}

function sanitizeKey(word) {
  const raw = String(word || "").trim()
  // Keep unicode for readability, but normalize spacing and unsafe chars
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

function publicObjectUrl(key) {
  return `${supabaseStorageBase.replace(/\/$/, '')}/object/public/${bucketName}/${encodeURI(key)}`
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

async function tryPublicHead(url) {
  const head = await fetch(url, { method: "HEAD", cache: "no-store" })
  return head.ok
}

async function signObjectUrl(key, expiresIn = 60 * 60 * 24 * 7) {
  // returns absolute signed URL string or null on failure
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
  // signedURL comes as a path beginning with /object/sign/...
  return `${supabaseUrl}/storage/v1${json.signedURL}`
}

export async function POST(req) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: "Missing Supabase env configuration" }), { status: 500 })
    }
    if (!process.env.FAL_KEY) {
      return new Response(JSON.stringify({ error: "Missing FAL_KEY env" }), { status: 500 })
    }
    if (!supabaseServiceRoleKey) {
      // We require service role so uploads are owned by the server (public asset)
      return new Response(JSON.stringify({ error: "Missing SUPABASE_SERVICE_ROLE_KEY env" }), { status: 500 })
    }

    const body = await req.json().catch(() => ({}))
    const word = (body?.word ?? "").toString().trim()
    if (!word) {
      return new Response(JSON.stringify({ error: "'word' is required" }), { status: 400 })
    }

    const objectKey = sanitizeKey(word)
    // 1) Skip generation if already present in bucket (check with admin auth to avoid public bucket dependency)
    const exists = await headObjectExistsWithAuth(objectKey)
    if (exists) {
      // Bucket is private now: always return a signed URL
      const url = await signObjectUrl(objectKey)
      return new Response(JSON.stringify({ ok: true, status: "exists", url, key: objectKey }), { status: 200 })
    }

    // 2) Generate with FAL AI (gpt-image-1-mini)
    fal.config({ credentials: process.env.FAL_KEY })
    const prompt = buildPrompt(word)

    const result = await fal.subscribe("fal-ai/gpt-image-1-mini", {
      input: {
        prompt,
        num_images: 1,
        output_format: "png",
      },
      logs: false,
    })

    const img = Array.isArray(result?.data?.images) ? result.data.images[0] : null
    const imgUrl = img?.url
    if (!imgUrl) {
      return new Response(JSON.stringify({ error: "No image returned from model" }), { status: 502 })
    }

    // 3) Fetch the image binary
    const r = await fetch(imgUrl)
    if (!r.ok) {
      return new Response(JSON.stringify({ error: `Failed to fetch generated image: ${r.status}` }), { status: 502 })
    }
    const buf = Buffer.from(await r.arrayBuffer())

    // 4) Upload to Supabase Storage as admin
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucketName}/${encodeURI(objectKey)}`
    const up = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Type": "image/png",
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        apikey: supabaseServiceRoleKey || supabaseAnonKey,
        "x-upsert": "false",
      },
      body: buf,
    })

    if (!up.ok) {
      const txt = await up.text().catch(() => "")
      return new Response(
        JSON.stringify({ error: "Upload failed", status: up.status, details: txt }),
        { status: 500 }
      )
    }

    // 5) Return signed URL for private bucket
    const url = await signObjectUrl(objectKey)
    return new Response(JSON.stringify({ ok: true, status: "uploaded", url, key: objectKey }), { status: 200 })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err?.message || "Unexpected error" }),
      { status: 500 }
    )
  }
}
