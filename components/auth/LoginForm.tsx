'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { isValidUniversityEmail } from '@/lib/utils'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthShell from './AuthShell'
import Banner from '@/components/ui/Banner'
import Button from '@/components/ui/Button'

export default function LoginForm() {
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
    <AuthShell title="Sign in" subtitle="Pool, ping pong and poker for the Houses.">
      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label htmlFor="email" className="label">
            University Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder={`your.email${universityDomain}`}
          />
          <p className="mt-1.5 text-xs text-zinc-500">Must be a {universityDomain} email address</p>
        </div>

        <div>
          <label htmlFor="password" className="label">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            placeholder="Enter your password"
          />
        </div>

        {error && <Banner tone="error">{error}</Banner>}

        <Button type="submit" full disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>

        <div className="space-y-1.5 text-center text-sm text-zinc-400">
          <p>
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="link">
              Sign up
            </Link>
          </p>
          <p>
            Need to set a password?{' '}
            <Link href="/setup-password" className="link">
              Set password
            </Link>
          </p>
        </div>
      </form>
    </AuthShell>
  )
}
