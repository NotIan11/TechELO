'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'

interface ProfileSummary {
  display_name: string
  profile_image_url: string | null
}

/** Avatar → /profile when signed in; "Sign in" otherwise. Sign-out lives on the profile page and in the mobile menu. */
export default function UserButton() {
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<ProfileSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    const loadProfile = async (id: string) => {
      const { data } = await supabase.from('users').select('display_name, profile_image_url').eq('id', id).single()
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

  if (loading) {
    return <div className="h-8 w-8 animate-pulse rounded-full bg-ink-700" />
  }

  if (!userId) {
    return (
      <Button href="/login" size="sm">
        Sign in
      </Button>
    )
  }

  return (
    <Link href="/profile" aria-label="Your profile" className="rounded-full transition hover:ring-2 hover:ring-orange-500/40">
      <Avatar src={profile?.profile_image_url} name={profile?.display_name || 'Me'} size="sm" />
    </Link>
  )
}
