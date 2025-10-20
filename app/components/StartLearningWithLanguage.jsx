'use client'

import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import LanguageSelector from '@/app/components/LanguageSelector'
import { useLanguage } from '@/app/contexts/LanguageContext'

export default function StartLearningWithLanguage({ startLabel = 'Start Learning', learningLabel, nativeLabel }) {
  const router = useRouter()
  const { commitPreferences, nativeLanguage } = useLanguage()
  const [submitting, setSubmitting] = useState(false)

  const deviceLocale = useMemo(() => {
    if (typeof navigator !== 'undefined' && navigator.language) {
      const lang = navigator.language.toLowerCase()
      if (lang.startsWith('zh')) return 'zh'
      if (lang.startsWith('ja')) return 'ja'
    }
    return 'en'
  }, [])

  const onStart = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      // Persist preferences only when user confirms by starting
      await commitPreferences()
    } catch (e) {
      // swallow errors: do not block navigation
      console.error('Failed to commit preferences:', e)
    } finally {
      router.push('/talk')
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <LanguageSelector kind="native" label={nativeLabel} />
      <LanguageSelector kind="learning" label={learningLabel} />
      <Button
        variant="outline"
        onClick={onStart}
        className="bg-white text-black border-zinc-700 hover:bg-zinc-800 hover:text-white font-semibold"
        disabled={submitting}
      >
        {startLabel}
      </Button>
    </div>
  )
}
