'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import Icon from '@/components/ui/Icon'
import Logo from '@/components/ui/Logo'
import UserButton from '@/components/auth/UserButton'
import SignOutButton from '@/components/auth/SignOutButton'
import { useInboxCount } from '@/components/layout/useInboxCount'

type NavKey = 'home' | 'pool' | 'ping_pong' | 'poker' | 'houses'

const navLinks: { key: NavKey; href: string; label: string }[] = [
  { key: 'home', href: '/', label: 'Home' },
  { key: 'pool', href: '/leaderboard?game_type=pool', label: 'Pool' },
  { key: 'ping_pong', href: '/leaderboard?game_type=ping_pong', label: 'Ping pong' },
  { key: 'poker', href: '/poker', label: 'Poker' },
  { key: 'houses', href: '/dorms', label: 'Houses' },
]

/** Which nav item owns the current URL. Table-game pages carry the game in ?game_type. */
function activeKey(pathname: string, gameType: string | null): NavKey | null {
  if (pathname === '/' || pathname.startsWith('/inbox')) return 'home'
  if (pathname.startsWith('/poker')) return 'poker'
  if (pathname.startsWith('/dorms')) return 'houses'
  if (pathname.startsWith('/leaderboard') || pathname === '/matches') return gameType === 'ping_pong' ? 'ping_pong' : 'pool'
  return null
}

export default function NavBar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const inboxCount = useInboxCount()
  const active = activeKey(pathname, searchParams.get('game_type'))

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

  const count = inboxCount > 0 && <span className="tabular text-[11px] font-medium text-orange-400">{inboxCount > 99 ? '99+' : inboxCount}</span>

  const mobileRow = (href: string, label: React.ReactNode, isActive: boolean, key?: string) => (
    <Link
      key={key ?? href}
      href={href}
      onClick={() => setMobileMenuOpen(false)}
      className={cn('flex min-h-[48px] items-center gap-2 border-b border-line text-[15px] transition', isActive ? 'text-white' : 'text-zinc-400 hover:text-white')}
    >
      {label}
    </Link>
  )

  return (
    <nav className="sticky top-0 z-40 border-b border-line bg-ink-950/85 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-[60px] items-center justify-between gap-3">
          <div className="flex items-center gap-7">
            <Link href="/" className="shrink-0" aria-label="Tech ELO home">
              <Logo />
            </Link>
            <div className="hidden items-center md:flex">
              {navLinks.map(({ key, href, label }) => (
                <Link
                  key={key}
                  href={href}
                  aria-current={active === key ? 'page' : undefined}
                  className={cn(
                    'relative inline-flex h-[60px] items-center gap-1.5 px-3 text-sm transition',
                    active === key ? 'text-white after:absolute after:inset-x-3 after:bottom-0 after:h-px after:bg-white' : 'text-zinc-400 hover:text-white'
                  )}
                >
                  {label}
                  {key === 'home' && count}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {signedIn && (
              <Link
                href="/play"
                aria-current={pathname === '/play' ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-[44px] items-center rounded px-[18px] text-sm font-medium transition',
                  pathname === '/play' ? 'border border-orange-500 text-orange-400' : 'bg-orange-500 text-black hover:bg-orange-400'
                )}
              >
                Play
              </Link>
            )}
            <UserButton />
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-zinc-300 transition hover:text-white md:hidden"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle menu"
            >
              <Icon name={mobileMenuOpen ? 'close' : 'menu'} className="h-5 w-5" />
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-line pb-4 md:hidden">
            {navLinks.map(({ key, href, label }) =>
              mobileRow(
                href,
                <>
                  {label}
                  {key === 'home' && count}
                </>,
                active === key,
                key
              )
            )}
            {signedIn ? (
              <>
                {mobileRow('/profile', 'Your page', pathname.startsWith('/profile'))}
                <div className="pt-2">
                  <SignOutButton row />
                </div>
              </>
            ) : (
              <>
                {mobileRow('/login', 'Sign in', pathname === '/login')}
                {mobileRow('/signup', 'Join', pathname === '/signup')}
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
