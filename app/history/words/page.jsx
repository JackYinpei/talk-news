'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import Navbar from '@/app/components/Navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

function formatDate(iso) {
  try {
    const d = new Date(iso)
    return d.toLocaleString()
  } catch {
    return iso
  }
}

export default function WordHistoryPage() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [rows, setRows] = useState([])
  const [hasMore, setHasMore] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all') // all | word | phrase | grammar | other

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
                  {row.filteredItems.map((it, idx) => (
                    <div
                      key={idx}
                      className="px-2 py-1 rounded-full bg-accent text-accent-foreground border border-border text-xs"
                    >
                      <span className="font-medium">{it?.text}</span>
                      <span className="ml-2 opacity-70">{it?.type || 'other'}</span>
                    </div>
                  ))}
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
