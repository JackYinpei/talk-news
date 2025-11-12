'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Zap, X } from 'lucide-react'

const DEFAULT_VIDEO_SRC = 'https://talknews-1308277566.cos.ap-shanghai.myqcloud.com/talknws-show.mp4'

export default function HeroVideoDemo({ buttonLabel = 'Watch Demo', videoSrc = DEFAULT_VIDEO_SRC }) {
  const [isOpen, setIsOpen] = useState(false)
  const videoRef = useRef(null)

  useEffect(() => {
    if (isOpen && videoRef.current) {
      try {
        videoRef.current.currentTime = 0
        const maybePromise = videoRef.current.play()
        if (maybePromise?.catch) {
          maybePromise.catch(() => {})
        }
      } catch {}
    }
  }, [isOpen])

  return (
    <>
      <Button
        variant="outline"
        size="lg"
        className="px-8 py-4 text-lg"
        onClick={() => setIsOpen(true)}
      >
        {buttonLabel}
        <Zap className="ml-2 h-5 w-5" />
      </Button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4"
          onClick={() => setIsOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Demo Video"
        >
          <div
            className="relative w-full max-w-4xl aspect-video bg-card rounded-lg overflow-hidden shadow-xl border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute top-3 right-3 z-10 bg-card text-foreground rounded-full p-2 shadow border border-border hover:bg-accent"
              onClick={() => setIsOpen(false)}
              aria-label="Close demo video"
            >
              <X className="h-5 w-5" />
            </button>
            <video
              className="w-full h-full"
              src={videoSrc}
              controls
              autoPlay
              muted
              playsInline
              ref={videoRef}
            />
          </div>
        </div>
      )}
    </>
  )
}
