'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn, isValidUniversityEmail } from '@/lib/utils'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthShell, { AUTH_FIELD, AUTH_LABEL } from './AuthShell'
import Banner from '@/components/ui/Banner'
import Button from '@/components/ui/Button'

/** One live figure in the ruled row under the statement */
export interface LoginFigure {
  label: string
  value: string
  name: string
  tone?: 'win'
}

export default function LoginForm({ figures = [] }: { figures?: LoginFigure[] }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/profile'

  const universityDomain = process.env.NEXT_PUBLIC_UNIVERSITY_EMAIL_DOMAIN || '@university.edu'

  // Check for error messages from URL params
  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam === 'link_expired') {
      setError('This confirmation link was already used or has expired. Sign in with your email and password below to receive a new confirmation email.')
    } else if (errorParam === 'email_not_confirmed') {
      setError('Please confirm your email address before logging in. Check your email for the confirmation link.')
    } else if (errorParam === 'auth_failed') {
      setError('Authentication failed. Please try again.')
    } else if (errorParam === 'no_email') {
      setError('User account has no email address. Please contact support.')
    } else if (errorParam === 'invalid_domain') {
      setError(`Please use your university email address (${universityDomain}).`)
    }
  }, [searchParams, universityDomain])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!isValidUniversityEmail(email, universityDomain)) {
      setError(`Please use your university email address (${universityDomain})`)
      setLoading(false)
      return
    }

    if (!password) {
      setError('Password is required')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Only treat as unconfirmed when Supabase explicitly says so (do not resend on "Invalid login credentials")
        const isUnconfirmedEmail =
          error.message?.toLowerCase().includes('email not confirmed') ||
          error.message?.toLowerCase().includes('email_not_confirmed') ||
          error.message?.toLowerCase().includes('confirm your email')

        if (isUnconfirmedEmail) {
          const { error: resendError } = await supabase.auth.resend({
            type: 'signup',
            email: email,
          })
          if (resendError) {
            console.error('Failed to resend confirmation email:', resendError)
            setError(`Please confirm your email address. Failed to resend confirmation email: ${resendError.message}`)
          } else {
            setError(`Please confirm your email address. A new confirmation email has been sent to ${email}. Please check your email and click the confirmation link before trying to log in again.`)
          }
        } else if (error.message?.includes('Invalid login credentials')) {
          setError('Incorrect email or password.')
        } else {
          throw error
        }
        return
      }

      router.push(redirect)
      router.refresh()
    } catch (error: any) {
      setError(error.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      statement="Settle it at the table."
      lede="Ratings for pool and ping pong, a ledger for poker. Every result confirmed by the people you played."
      footer={
        figures.length > 0 ? (
          <dl className="grid grid-cols-3 gap-6 border-t border-line-strong pt-5">
            {figures.map((f) => (
              <div key={f.label} className="min-w-0">
                <dt className="text-xs text-mute">{f.label}</dt>
                <dd className={cn('tabular mt-1.5 truncate text-2xl tracking-[-0.03em]', f.tone === 'win' ? 'text-win' : 'text-white')}>{f.value}</dd>
                <dd className="mt-0.5 truncate text-[13px] text-zinc-400">{f.name}</dd>
              </div>
            ))}
          </dl>
        ) : null
      }
      title="Sign in"
      below={
        <>
          New here?{' '}
          <Link href="/signup" className="link">
            Join with your university email
          </Link>
        </>
      }
    >
      <form onSubmit={handleLogin} className="flex flex-col gap-[18px]">
        <div>
          <label htmlFor="email" className={AUTH_LABEL}>
            University email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={AUTH_FIELD}
            placeholder={`your.email${universityDomain}`}
          />
          <p className="mt-1.5 text-xs text-mute">Must be a {universityDomain} email address</p>
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px] text-zinc-400">
            <label htmlFor="password">Password</label>
            <Link href="/setup-password" className="link">
              Need to set a password?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={AUTH_FIELD}
            placeholder="Enter your password"
          />
        </div>

        {error && <Banner tone="error">{error}</Banner>}

        <Button type="submit" size="lg" full disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthShell>
  )
}
