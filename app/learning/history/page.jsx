'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'

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
      <div className="min-h-[60vh] flex items-center justify-center text-white/80">
        正在加载会话...
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-white/80">
        <div className="text-xl mb-2">请先登录</div>
        <a href="/sign-in" className="text-blue-400 underline">去登录</a>
      </div>
    )
  }

  const lastTimestamp = rows.length > 0 ? rows[rows.length - 1]?.timestamp : null

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 text-white">
      <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">单词历史记录</h1>
          <p className="text-white/60 mt-1">查看你保存过的生词与语法点</p>
        </div>
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索单词/短语..."
            className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">全部类型</option>
            <option value="word">单词</option>
            <option value="phrase">短语</option>
            <option value="grammar">语法</option>
            <option value="other">其他</option>
          </select>
          <button
            onClick={() => fetchPage()}
            disabled={loading}
            className="px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50"
          >刷新</button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200">
          加载错误：{error}
        </div>
      )}

      {filtered.length === 0 && !loading && (
        <div className="text-white/60">暂无记录</div>
      )}

      <div className="space-y-4">
        {filtered.map((row) => (
          <div key={row.id} className="rounded-lg bg-white/5 border border-white/10 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-white/60">{formatDate(row.timestamp)}</div>
            </div>
            {row.user_message && (
              <div className="mb-2 text-white/80">
                <span className="text-white/50">用户消息：</span>{row.user_message}
              </div>
            )}
            {row.context && (
              <div className="mb-2 text-white/60 text-sm">
                <span className="text-white/40">上下文：</span>{row.context}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {row.filteredItems.map((it, idx) => (
                <div key={idx} className="px-2 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-200 text-sm">
                  <span className="font-medium">{it?.text}</span>
                  <span className="ml-2 text-blue-200/70">{it?.type || 'other'}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-center">
        {hasMore ? (
          <button
            onClick={() => fetchPage({ before: lastTimestamp })}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 hover:bg-white/15 disabled:opacity-60"
          >
            {loading ? '加载中...' : '加载更多'}
          </button>
        ) : (
          <div className="text-white/40 text-sm">没有更多了</div>
        )}
      </div>
    </div>
  )
}

