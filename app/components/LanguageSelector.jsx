'use client'

import React, { useMemo } from 'react'
import { useLanguage } from '@/app/contexts/LanguageContext'

export default function LanguageSelector({ className = '', kind = 'learning', label }) {
  const {
    learningLanguage,
    nativeLanguage,
    setLearningLanguage,
    setNativeLanguage,
    options,
  } = useLanguage()

  const isNative = kind === 'native'

  const { value, onChange, list } = useMemo(() => {
    if (isNative) {
      const nativeOptions = [{ code: 'zh-CN', label: '中文' }, ...options]
      const seen = new Set()
      const dedup = nativeOptions.filter((o) => {
        const k = o.code
        if (seen.has(k)) return false
        seen.add(k)
        return true
      })
      return {
        value: nativeLanguage?.code || 'zh-CN',
        onChange: (code) => setNativeLanguage(code),
        list: dedup,
      }
    }
    return {
      value: learningLanguage?.code || 'en',
      onChange: (code) => setLearningLanguage(code),
      list: options,
    }
  }, [isNative, learningLanguage?.code, nativeLanguage?.code, options, setLearningLanguage, setNativeLanguage])

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {label ? (
        <label htmlFor={`${kind}-language`} className="text-sm text-zinc-300">
          {label}
        </label>
      ) : null}
      <select
        id={`${kind}-language`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-zinc-900 border border-zinc-700 text-white text-sm rounded-md px-2 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-500"
        aria-label={`Select ${kind} language`}
      >
        {list.map((opt) => (
          <option key={opt.code} value={opt.code}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

