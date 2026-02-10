'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

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
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-900">
        <div className="w-full max-w-md space-y-6 rounded-lg border border-gray-700 bg-gray-800 p-8 shadow-lg text-center">
          <h1 className="text-xl font-bold text-white">Invalid or expired link</h1>
          <p className="text-gray-400">
            This confirmation link is invalid or has expired. You can sign in to request a new confirmation email.
          </p>
          <Link
            href="/login?error=link_expired"
            className="inline-block rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Go to Sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-900">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-gray-700 bg-gray-800 p-8 shadow-lg text-center">
        <h1 className="text-xl font-bold text-white">Confirm your email</h1>
        <p className="text-gray-400">
          Click the button below to confirm your email address.
        </p>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={loading}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Confirming...' : 'Confirm my email'}
        </button>
        {error && (
          <div className="rounded-md bg-red-900/20 p-4 text-left">
            <p className="text-sm text-red-200">{error}</p>
            <p className="mt-2 text-sm text-gray-400">
              You can sign in to request a new confirmation email.
            </p>
            <Link href="/login?error=link_expired" className="mt-2 inline-block text-sm text-blue-400 hover:text-blue-300">
              Go to Sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
