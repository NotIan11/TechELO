'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { isValidUniversityEmail } from '@/lib/utils'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthShell from './AuthShell'
import Banner from '@/components/ui/Banner'
import Button from '@/components/ui/Button'

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
      title={isCompletingProfile ? 'Complete your profile' : 'Join Tech ELO'}
      subtitle={
        isCompletingProfile
          ? 'Add your name so opponents know who beat them'
          : 'Pool, ping pong and poker for the Houses. All you need is a university email.'
      }
    >
      <form onSubmit={handleSignup} className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className="label">
              First Name
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="input"
              placeholder="John"
            />
          </div>
          <div>
            <label htmlFor="lastName" className="label">
              Last Name
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="input"
              placeholder="Doe"
            />
          </div>
        </div>

        {!isCompletingProfile && (
          <>
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
              <p className="mt-1.5 text-xs text-zinc-500">
                Must be a {universityDomain} email address
              </p>
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
                placeholder="Choose a password"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                placeholder="Confirm your password"
              />
            </div>
          </>
        )}

        {error && <Banner tone="error">{error}</Banner>}

        {message && <Banner tone="success">{message}</Banner>}

        <Button type="submit" full disabled={loading}>
          {loading
            ? isCompletingProfile
              ? 'Updating…'
              : 'Creating…'
            : isCompletingProfile
              ? 'Save profile'
              : 'Create account'}
        </Button>

        {!isCompletingProfile && (
          <p className="text-center text-sm text-zinc-400">
            Already have an account?{' '}
            <Link href="/login" className="link">
              Sign in
            </Link>
          </p>
        )}
      </form>
    </AuthShell>
  )
}
