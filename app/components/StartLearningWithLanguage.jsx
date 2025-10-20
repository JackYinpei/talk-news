'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import LanguageSelector from '@/app/components/LanguageSelector'
import { useLanguage } from '@/app/contexts/LanguageContext'

export default function StartLearningWithLanguage() {
  const router = useRouter()
  const { commitPreferences } = useLanguage()
  const [submitting, setSubmitting] = useState(false)

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
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        onClick={onStart}
        className="bg-white text-black border-zinc-700 hover:bg-zinc-800 hover:text-white font-semibold"
        disabled={submitting}
      >
        Start Learning
      </Button>
      <LanguageSelector />
    </div>
  )
}

