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
    <Button variant="secondary" onClick={share} type="button">
      {copied ? 'Link copied' : 'Share link'}
    </Button>
  )
}
