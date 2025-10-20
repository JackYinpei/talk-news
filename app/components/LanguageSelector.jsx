'use client'

import React from 'react'
import { useLanguage } from '@/app/contexts/LanguageContext'

export default function LanguageSelector({ className = '' }) {
  const { learningLanguage, setLearningLanguage, options } = useLanguage()

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <select
        id="learning-language"
        value={learningLanguage?.code || 'en'}
        onChange={(e) => setLearningLanguage(e.target.value)}
        className="bg-zinc-900 border border-zinc-700 text-white text-sm rounded-md px-2 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-500"
        aria-label="Select target learning language"
      >
        {options.map((opt) => (
          <option key={opt.code} value={opt.code}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

