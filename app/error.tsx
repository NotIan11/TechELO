'use client'

import { useEffect } from 'react'
import MinimalShell from '@/components/layout/MinimalShell'
import Button from '@/components/ui/Button'
import Icon from '@/components/ui/Icon'

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
    <MinimalShell>
      <div className="card w-full max-w-md p-8 text-center">
        <span className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-loss/20 bg-loss/10 text-loss">
          <Icon name="alert" className="h-6 w-6" />
        </span>
        <h1 className="font-display text-2xl font-bold tracking-tight text-white">Something went wrong</h1>
        <p className="mt-2 text-sm text-zinc-400">{error.message || 'An unexpected error occurred.'}</p>
        {error.digest && <p className="mt-2 font-mono text-xs text-zinc-600">Digest: {error.digest}</p>}
        {process.env.NODE_ENV !== 'production' && (
          <p className="mt-3 text-xs text-zinc-500">
            Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in the environment.
          </p>
        )}
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={reset} type="button">
            Try again
          </Button>
          <Button href="/" variant="secondary">
            Home
          </Button>
        </div>
      </div>
    </MinimalShell>
  )
}
