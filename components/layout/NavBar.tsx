'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import Logo from '@/components/ui/Logo'
import UserButton from '@/components/auth/UserButton'
import InboxButton from '@/components/layout/InboxButton'

const navLinks = [
  { href: '/', label: 'Leaderboard' },
  { href: '/matches', label: 'Matches' },
  { href: '/poker', label: 'Poker' },
  { href: '/dorms', label: 'Houses' },
]

export default function NavBar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <nav className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink-950/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          <div className="flex items-center gap-8">
            <Link href="/" className="shrink-0" aria-label="Tech ELO home">
              <Logo />
            </Link>
            <div className="hidden items-center gap-1 md:flex">
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'rounded-lg px-3.5 py-2 text-sm font-medium transition',
                    isActive(href)
                      ? 'bg-white/[0.08] text-white'
                      : 'text-zinc-400 hover:bg-ink-700 hover:text-white'
                  )}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <InboxButton />
            <UserButton />
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-zinc-300 transition hover:bg-white/[0.06] hover:text-white md:hidden"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle menu"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-white/[0.06] pb-3 md:hidden">
            <div className="flex flex-col gap-1 pt-3">
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex min-h-[44px] items-center rounded-lg px-4 text-sm font-medium transition',
                    isActive(href)
                      ? 'bg-white/[0.08] text-white'
                      : 'text-zinc-400 hover:bg-ink-700 hover:text-white'
                  )}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
