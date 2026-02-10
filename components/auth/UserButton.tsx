'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import ThemeToggle from '@/components/ui/ThemeToggle'

export default function UserButton() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return <div className="h-8 w-8 animate-pulse rounded-full bg-gray-700" />
  }

  if (!user) {
    return (
      <a
        href="/login"
        className="inline-flex min-h-[44px] items-center rounded-md bg-blue-600 px-4 py-3 text-white hover:bg-blue-700"
      >
        Sign In
      </a>
    )
  }

  return (
    <div className="flex items-center gap-2 sm:gap-4">
      <a
        href="/profile"
        className="inline-flex min-h-[44px] items-center text-sm text-gray-300 hover:text-white"
      >
        Profile
      </a>
      <button
        type="button"
        onClick={handleSignOut}
        className="inline-flex min-h-[44px] items-center rounded-md bg-gray-700 px-4 py-3 text-sm text-gray-300 hover:bg-gray-600"
      >
        Sign Out
      </button>
    </div>
  )
}
