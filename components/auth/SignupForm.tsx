'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn, isValidUniversityEmail } from '@/lib/utils'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthShell, { AUTH_FIELD, AUTH_LABEL } from './AuthShell'
import Banner from '@/components/ui/Banner'
import Button from '@/components/ui/Button'

const STEPS = ['Join', 'Confirm your email', 'Challenge someone']

export default function SignupForm() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const isCompletingProfile = searchParams.get('complete') === 'true'

  const universityDomain = process.env.NEXT_PUBLIC_UNIVERSITY_EMAIL_DOMAIN || '@university.edu'

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required')
      setLoading(false)
      return
    }

    if (isCompletingProfile) {
      // User is already authenticated, just update their profile
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          throw new Error('Not authenticated')
        }

        const { error: updateError } = await supabase
          .from('users')
          .update({
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            display_name: `${firstName.trim()} ${lastName.trim()}`,
          })
          .eq('id', user.id)

        if (updateError) throw updateError

        setMessage('Profile saved. Redirecting.')
        setTimeout(() => {
          router.push('/profile')
        }, 1000)
      } catch (error: any) {
        setError(error.message || 'An error occurred')
      } finally {
        setLoading(false)
      }
      return
    }

    if (!isValidUniversityEmail(email, universityDomain)) {
      setError(`Please use your university email address (${universityDomain})`)
      setLoading(false)
      return
    }

    // New signup - validate password
    if (!password) {
      setError('Password is required')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error

      setMessage('Account created. Check your email to confirm it.')
    } catch (error: any) {
      setError(error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      statement="Everyone starts at 1500."
      lede="One confirmed match puts you on the board. One logged night puts you on the ledger."
      footer={
        <ol className="grid grid-cols-3 gap-6 border-t border-line-strong pt-5">
          {STEPS.map((step, i) => (
            <li key={step} className="min-w-0">
              <span className={cn('tabular block text-xs', i === 0 ? 'text-white' : 'text-mute')}>{i + 1}</span>
              <span className={cn('mt-1.5 block text-sm', i === 0 ? 'text-white' : 'text-zinc-400')}>{step}</span>
            </li>
          ))}
        </ol>
      }
      title={isCompletingProfile ? 'Complete your profile' : 'Join'}
      subtitle={isCompletingProfile ? 'Add your name so opponents know who beat them' : 'All you need is a university email.'}
      below={
        !isCompletingProfile ? (
          <>
            Already playing?{' '}
            <Link href="/login" className="link">
              Sign in
            </Link>
          </>
        ) : undefined
      }
    >
      <form onSubmit={handleSignup} className="flex flex-col gap-[18px]">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className={AUTH_LABEL}>
              First name
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              autoComplete="given-name"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={AUTH_FIELD}
              placeholder="John"
            />
          </div>
          <div>
            <label htmlFor="lastName" className={AUTH_LABEL}>
              Last name
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              autoComplete="family-name"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={AUTH_FIELD}
              placeholder="Doe"
            />
          </div>
        </div>
        <p className="-mt-2.5 text-xs text-mute">Your name, as opponents will see it.</p>

        {!isCompletingProfile && (
          <>
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
              <label htmlFor="password" className={AUTH_LABEL}>
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={AUTH_FIELD}
                placeholder="Choose a password"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className={AUTH_LABEL}>
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={AUTH_FIELD}
                placeholder="Confirm your password"
              />
            </div>
          </>
        )}

        {error && <Banner tone="error">{error}</Banner>}

        {message && <Banner tone="success">{message}</Banner>}

        <Button type="submit" size="lg" full disabled={loading}>
          {loading
            ? isCompletingProfile
              ? 'Updating…'
              : 'Creating…'
            : isCompletingProfile
              ? 'Save profile'
              : 'Create account'}
        </Button>
      </form>
    </AuthShell>
  )
}
