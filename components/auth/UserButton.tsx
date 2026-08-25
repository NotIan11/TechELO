'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'

interface ProfileSummary {
  display_name: string
  profile_image_url: string | null
}

export default function UserButton() {
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<ProfileSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    const loadProfile = async (id: string) => {
      const { data } = await supabase
        .from('users')
        .select('display_name, profile_image_url')
        .eq('id', id)
        .single()
      if (!cancelled) setProfile(data)
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return
      setUserId(user?.id ?? null)
      setLoading(false)
      if (user) loadProfile(user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return
      const id = session?.user?.id ?? null
      setUserId(id)
      if (id) loadProfile(id)
      else setProfile(null)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return <div className="h-9 w-9 animate-pulse rounded-full bg-white/[0.06]" />
  }

  if (!userId) {
    return (
      <Button href="/login" size="sm">
        Sign In
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <Link
        href="/profile"
        aria-label="Your profile"
        className="rounded-full transition hover:ring-2 hover:ring-orange-500/40"
      >
        <Avatar src={profile?.profile_image_url} name={profile?.display_name || 'Me'} size="sm" />
      </Link>
      <button
        type="button"
        onClick={handleSignOut}
        aria-label="Sign out"
        title="Sign out"
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
          />
        </svg>
      </button>
    </div>
  )
}
