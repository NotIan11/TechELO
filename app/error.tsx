'use client'

import { useEffect } from 'react'
import Button from '@/components/ui/Button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="card w-full max-w-md p-8 text-center">
        <p className="mb-3 text-4xl" aria-hidden="true">
          💥
        </p>
        <h1 className="font-display text-2xl font-bold text-white">Something went wrong</h1>
        <p className="mt-2 text-sm text-zinc-400">{error.message || 'An unexpected error occurred'}</p>
        {error.digest && <p className="mt-2 font-mono text-xs text-zinc-600">Digest: {error.digest}</p>}
        <p className="mt-3 text-xs text-zinc-500">
          If this happens on Vercel, add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
          in Project Settings → Environment Variables.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button href="/" variant="secondary">
            Go home
          </Button>
        </div>
      </div>
    </div>
  )
}
