'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AuthShell from '@/components/auth/AuthShell'
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
    <AuthShell
      title="Set your password"
      subtitle="Set a password for your account to continue using Tech ELO"
    >
      <form onSubmit={handleSetupPassword} className="space-y-5">
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

        {error && <Banner tone="error">{error}</Banner>}

        <Button type="submit" full disabled={loading}>
          {loading ? 'Setting password…' : 'Set password'}
        </Button>
      </form>
    </AuthShell>
  )
}
