'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AuthShell from './AuthShell'
import Button from '@/components/ui/Button'

interface ConfirmEmailProps {
  tokenHash: string | null
  type: string | null
}

export default function ConfirmEmail({ tokenHash, type }: ConfirmEmailProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleConfirm = async () => {
    if (!tokenHash || !type) return
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as 'signup',
      })
      if (verifyError) throw verifyError
      router.push('/profile')
      router.refresh()
    } catch (err: any) {
      setError(err?.message || 'This link is invalid or has already been used.')
      setLoading(false)
    }
  }

  if (!tokenHash || !type) {
    return (
      <AuthShell
        title="Invalid or expired link"
        subtitle="This confirmation link is invalid or has expired. Sign in to request a new confirmation email."
      >
        <Button href="/login?error=link_expired" full>
          Go to Sign in
        </Button>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Confirm your email" subtitle="One click and you're on the board.">
      <div className="space-y-4">
        <Button type="button" onClick={handleConfirm} disabled={loading} full>
          {loading ? 'Confirming…' : 'Confirm my email'}
        </Button>
        {error && (
          <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-left">
            <p className="text-sm text-red-300">{error}</p>
            <p className="mt-2 text-sm text-slate-400">
              You can sign in to request a new confirmation email.
            </p>
            <Link
              href="/login?error=link_expired"
              className="mt-2 inline-block text-sm font-medium text-orange-400 hover:text-orange-300"
            >
              Go to Sign in
            </Link>
          </div>
        )}
      </div>
    </AuthShell>
  )
}
