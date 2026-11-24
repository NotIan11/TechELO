'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { AUTH_FIELD, AUTH_LABEL } from '@/components/auth/AuthShell'
import MinimalShell from '@/components/layout/MinimalShell'
import Button from '@/components/ui/Button'
import Banner from '@/components/ui/Banner'
import { PageSpinner } from '@/components/ui/Spinner'

export default function SetupPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }
      setChecking(false)
    }

    checkAuth()
  }, [router])

  const handleSetupPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

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
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      router.push('/profile')
      router.refresh()
    } catch (error: any) {
      setError(error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return <PageSpinner />
  }

  return (
    <MinimalShell title="Set your password" lede="Set a password for your account to continue using Tech ELO">
      <form onSubmit={handleSetupPassword} className="flex max-w-[380px] flex-col gap-[18px]">
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

        {error && <Banner tone="error">{error}</Banner>}

        <Button type="submit" size="lg" full disabled={loading}>
          {loading ? 'Setting password…' : 'Set password'}
        </Button>
      </form>
    </MinimalShell>
  )
}
