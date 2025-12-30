'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import Navbar from '@/app/components/Navbar'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent } from '@/app/components/ui/card'

function formatDate(iso) {
  try {
    const d = new Date(iso)
    return d.toLocaleString()
  } catch {
    return iso
  }
}

// Client no longer constructs public URLs; it requests a signed URL from API

export default function WordHistoryPage() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [rows, setRows] = useState([])
  const [hasMore, setHasMore] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all') // all | word | phrase | grammar | other
  const [iconState, setIconState] = useState({}) // { [word]: { loading, url, error } }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows
      .map((r) => ({
        ...r,
        filteredItems: (Array.isArray(r.items) ? r.items : []).filter((it) => {
          const matchType = typeFilter === 'all' || (it?.type || 'other') === typeFilter
          const matchQuery = !q || String(it?.text || '').toLowerCase().includes(q)
          return matchType && matchQuery
        }),
      }))
      .filter((r) => r.filteredItems.length > 0)
  }, [rows, search, typeFilter])

  async function fetchPage({ before } = {}) {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams()
      qs.set('limit', '50')
      if (before) qs.set('before', before)
      const res = await fetch(`/api/learning/unfamiliar-english?${qs.toString()}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        cache: 'no-store',
      })
      const text = await res.text()
      let json
      try { json = text ? JSON.parse(text) : {} } catch { json = { raw: text } }
      if (!res.ok) {
        throw new Error(json?.error || json?.message || 'Failed to load history')
      }
      const list = Array.isArray(json?.data) ? json.data : []
      // Append or initialize
      setRows((prev) => (before ? [...prev, ...list] : list))
      setHasMore(list.length === 50)
    } catch (e) {
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'authenticated') {
      fetchPage()
    }
  }, [status])

  // Preload existing icons (no generation). For visible filtered words only.
  useEffect(() => {
    const words = new Set()
    filtered.forEach((row) => {
      (row.filteredItems || []).forEach((it) => {
        if ((it?.type || 'other') === 'word') {
          const w = String(it?.text || '').trim()
          if (w) words.add(w)
        }
      })
    })
    const missing = Array.from(words).filter((w) => !iconState[w])
    if (missing.length === 0) return
    let cancelled = false
    ;(async () => {
      // Mark all missing as loading upfront
      setIconState((s) => {
        const next = { ...s }
        for (const w of missing) {
          next[w] = { ...(s[w] || {}), loading: true, error: null }
        }
        return next
      })

      try {
        const res = await fetch('/api/icons/sign-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ words: missing }),
        })
        const text = await res.text()
        let json
        try { json = text ? JSON.parse(text) : {} } catch { json = { raw: text } }
        if (cancelled) return
        const results = json?.results || {}
        setIconState((s) => {
          const next = { ...s }
          for (const w of missing) {
            const r = results[w]
            if (r?.exists && r?.url) {
              next[w] = { loading: false, url: r.url, error: null }
            } else {
              next[w] = { loading: false, url: null, error: null }
            }
          }
          return next
        })
      } catch {
        if (cancelled) return
        setIconState((s) => {
          const next = { ...s }
          for (const w of missing) {
            next[w] = { loading: false, url: null, error: null }
          }
          return next
        })
      }
    })()
    return () => { cancelled = true }
  }, [filtered])

  async function generateIcon(word) {
    const key = String(word || '').trim()
    if (!key) return
    setIconState((s) => ({
      ...s,
      [key]: { ...(s[key] || {}), loading: true, error: null },
    }))
    try {
      const res = await fetch('/api/icons/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: key }),
      })
      const text = await res.text()
      let json
      try { json = text ? JSON.parse(text) : {} } catch { json = { raw: text } }
      if (!res.ok) throw new Error(json?.error || '生成失败')
      const url = json?.url
      setIconState((s) => ({
        ...s,
        [key]: { loading: false, url, error: null },
      }))
    } catch (e) {
      setIconState((s) => ({
        ...s,
        [key]: { loading: false, url: null, error: e?.message || String(e) },
      }))
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">
          正在加载会话...
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-muted-foreground">
          <div className="text-xl mb-2 text-foreground">请先登录</div>
          <a href="/sign-in" className="text-primary underline">去登录</a>
        </div>
      </div>
    )
  }

  const lastTimestamp = rows.length > 0 ? rows[rows.length - 1]?.timestamp : null

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">单词历史记录</h1>
            <p className="text-muted-foreground mt-1">查看你保存过的生词与语法点</p>
          </div>
          <div className="flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索单词/短语..."
              className="px-3 py-2 rounded-md bg-background border border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring outline-none"
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-md bg-background border border-input text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring outline-none"
            >
              <option value="all">全部类型</option>
              <option value="word">单词</option>
              <option value="phrase">短语</option>
              <option value="grammar">语法</option>
              <option value="other">其他</option>
            </select>
            <Button onClick={() => fetchPage()} disabled={loading}>
              刷新
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive">
            加载错误：{error}
          </div>
        )}

        {filtered.length === 0 && !loading && (
          <div className="text-muted-foreground">暂无记录</div>
        )}

        <div className="space-y-4">
          {filtered.map((row) => (
            <Card key={row.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-muted-foreground">{formatDate(row.timestamp)}</div>
                </div>
                {row.user_message && (
                  <div className="mb-2">
                    <span className="text-muted-foreground">用户消息：</span>{row.user_message}
                  </div>
                )}
                {row.context && (
                  <div className="mb-2 text-sm text-muted-foreground">
                    <span className="opacity-70">上下文：</span>{row.context}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {row.filteredItems.map((it, idx) => {
                    const word = String(it?.text || '')
                    const state = iconState[word] || { loading: false, url: null, error: null }
                    const isWord = (it?.type || 'other') === 'word'
                    return (
                      <div
                        key={idx}
                        className="flex items-stretch h-16 rounded-full bg-accent text-accent-foreground border border-border text-sm overflow-hidden"
                      >
                        <div className="flex items-center gap-2 px-3">
                          <span className="font-medium">{word}</span>
                          <span className="opacity-70 text-xs">{it?.type || 'other'}</span>
                        </div>
                        {isWord && (
                          <>
                            {state.url ? (
                              <div className="w-24 shrink-0 overflow-hidden">
                                <img
                                  src={state.url}
                                  alt={word}
                                  className="h-full w-full object-cover"
                                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                                />
                              </div>
                            ) : (
                              <button
                                className="ml-2 mr-2 my-2 px-3 rounded bg-primary text-primary-foreground disabled:opacity-50"
                                onClick={() => generateIcon(word)}
                                disabled={state.loading}
                                title="生成图"
                              >
                                {state.loading ? '生成中...' : '生成图'}
                              </button>
                            )}
                            {state.error && (
                              <span className="self-center pr-2 text-destructive/80 text-xs">{state.error}</span>
                            )}
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-center">
          {hasMore ? (
            <Button
              variant="outline"
              onClick={() => fetchPage({ before: lastTimestamp })}
              disabled={loading}
            >
              {loading ? '加载中...' : '加载更多'}
            </Button>
          ) : (
            <div className="text-muted-foreground text-sm">没有更多了</div>
          )}
        </div>
      </main>
    </div>
  )
}
