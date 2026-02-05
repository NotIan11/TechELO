'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isValidUniversityEmail } from '@/lib/utils'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginPage() {
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
    if (errorParam === 'email_not_confirmed') {
      setError('Please confirm your email address before logging in. Check your email for the confirmation link.')
    } else if (errorParam === 'auth_failed') {
      setError('Authentication failed. Please try again.')
    } else if (errorParam === 'no_email') {
      setError('User account has no email address. Please contact support.')
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validate university email
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Check if error is due to unconfirmed email
        const isUnconfirmedEmail = 
          error.message?.toLowerCase().includes('email not confirmed') ||
          error.message?.toLowerCase().includes('email_not_confirmed') ||
          error.message?.toLowerCase().includes('confirm your email') ||
          error.status === 400 && error.message?.toLowerCase().includes('email')
        
        if (isUnconfirmedEmail) {
          // Automatically resend confirmation email
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
          // Check if user exists but email might be unconfirmed
          // Try to resend confirmation email as a fallback
          const { error: resendError } = await supabase.auth.resend({
            type: 'signup',
            email: email,
          })
          
          // If resend succeeds, it means user exists but email is unconfirmed
          if (!resendError) {
            setError(`Please confirm your email address. A new confirmation email has been sent to ${email}. Please check your email and click the confirmation link before trying to log in again.`)
          } else {
            // Resend failed, likely wrong credentials
            setError('Invalid email or password. If you signed up with a magic link, please contact support or use password reset.')
          }
        } else {
          throw error
        }
        return
      }

      // After successful login, check if we need to redirect to setup-password
      // This check happens in middleware or we can do it here
      router.push(redirect)
      router.refresh()
    } catch (error: any) {
      // Handle any other errors
      setError(error.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-900">
      <div className="w-full max-w-md space-y-8 rounded-lg border border-gray-700 bg-gray-800 p-8 shadow-lg">
        <div>
          <h1 className="text-3xl font-bold text-center text-white">HouseRank</h1>
          <p className="mt-2 text-center text-gray-400">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="mt-8 space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">
              University Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-600 bg-gray-700 text-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder={`your.email${universityDomain}`}
            />
            <p className="mt-1 text-xs text-gray-400">
              Must be a {universityDomain} email address
            </p>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-600 bg-gray-700 text-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-900/20 p-4">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div className="text-center space-y-2">
            <p className="text-sm text-gray-400">
              Don't have an account?{' '}
              <a href="/signup" className="text-blue-400 hover:text-blue-300">
                Sign up
              </a>
            </p>
            <p className="text-sm text-gray-400">
              Need to set a password?{' '}
              <a href="/setup-password" className="text-blue-400 hover:text-blue-300">
                Set Password
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
