'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'

/** Native share when available, otherwise copies the link */
export default function ShareButton({ path, title }: { path: string; title: string }) {
  const [copied, setCopied] = useState(false)

  const share = async () => {
    const url = `${window.location.origin}${path}`
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* user cancelled or clipboard blocked */
    }
  }

  return (
    <Button size="sm" variant="ghost" onClick={share} type="button" aria-label="Share link">
      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 12 12 7.5m0 0 4.5 4.5M12 7.5V18" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75v2.25A1.5 1.5 0 0 0 6 19.5h12a1.5 1.5 0 0 0 1.5-1.5v-2.25" />
      </svg>
      {copied ? 'Link copied' : 'Share'}
    </Button>
  )
}
