'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import Icon from '@/components/ui/Icon'
import Logo from '@/components/ui/Logo'
import UserButton from '@/components/auth/UserButton'
import SignOutButton from '@/components/auth/SignOutButton'
import InboxButton from '@/components/layout/InboxButton'
import { useInboxCount } from '@/components/layout/useInboxCount'

const navLinks = [
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/matches', label: 'Matches' },
  { href: '/poker', label: 'Poker' },
  { href: '/dorms', label: 'Houses' },
]

export default function NavBar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const pathname = usePathname()
  const inboxCount = useInboxCount()

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!cancelled) setSignedIn(!!user)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) setSignedIn(!!session?.user)
    })
    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const mobileRow = (href: string, label: string, onClick?: () => void) => (
    <Link
      key={href}
      href={href}
      onClick={() => {
        setMobileMenuOpen(false)
        onClick?.()
      }}
      className={cn(
        'flex min-h-[44px] items-center border-l-2 px-3 text-sm font-medium transition',
        isActive(href) ? 'border-orange-500 text-white' : 'border-transparent text-zinc-400 hover:text-white'
      )}
    >
      {label}
    </Link>
  )

  return (
    <nav className="sticky top-0 z-40 border-b border-line bg-ink-950/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          <div className="flex items-center gap-8">
            <Link href="/" className="shrink-0" aria-label="Tech ELO home">
              <Logo />
            </Link>
            <div className="hidden items-center md:flex">
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'relative inline-flex h-16 items-center px-3.5 text-sm font-medium transition',
                    isActive(href)
                      ? 'text-white after:absolute after:inset-x-3.5 after:bottom-0 after:h-0.5 after:bg-orange-500'
                      : 'text-zinc-400 hover:text-white'
                  )}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <InboxButton count={inboxCount} />
            <UserButton />
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-zinc-300 transition hover:bg-ink-700 hover:text-white md:hidden"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle menu"
            >
              <Icon name={mobileMenuOpen ? 'close' : 'menu'} className="h-6 w-6" />
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-line pb-3 md:hidden">
            <div className="flex flex-col py-2">{navLinks.map(({ href, label }) => mobileRow(href, label))}</div>
            <div className="flex flex-col border-t border-line py-2">
              {signedIn ? (
                <>
                  {mobileRow('/inbox', inboxCount > 0 ? `Inbox (${inboxCount})` : 'Inbox')}
                  {mobileRow('/profile', 'Profile')}
                  <div className="px-3">
                    <SignOutButton row />
                  </div>
                </>
              ) : (
                <>
                  {mobileRow('/login', 'Sign in')}
                  {mobileRow('/signup', 'Join')}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
