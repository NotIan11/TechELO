'use client'

import { useEffect } from 'react'
import MinimalShell from '@/components/layout/MinimalShell'
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
    <MinimalShell kicker={<span className="text-loss">Error</span>} title="Something went wrong" lede={error.message || 'An unexpected error occurred.'}>
      {error.digest && <p className="tabular text-xs text-mute">Digest: {error.digest}</p>}
      {process.env.NODE_ENV !== 'production' && (
        <p className="mt-3 text-xs text-mute">
          Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in the environment.
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={reset} type="button">
          Try again
        </Button>
        <Button href="/" variant="secondary">
          Home
        </Button>
      </div>
    </MinimalShell>
  )
}
