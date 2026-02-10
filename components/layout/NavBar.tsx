'use client'

import Link from 'next/link'
import { useState } from 'react'
import UserButton from '@/components/auth/UserButton'
import InboxButton from '@/components/layout/InboxButton'

export default function NavBar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navLinks = [
    { href: '/', label: 'Leaderboard' },
    { href: '/matches', label: 'Matches' },
    { href: '/dorms', label: 'Houses' },
  ]

  return (
    <nav className="bg-black shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold text-white">
              Tech ELO
            </Link>
            <div className="hidden md:flex gap-4">
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="text-sm text-gray-300 hover:text-white"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <InboxButton />
            <UserButton />
            {/* Hamburger: min 44px tap area for accessibility */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="inline-flex min-h-[44px] min-w-[44px] md:hidden items-center justify-center rounded-md text-gray-300 hover:bg-gray-800 hover:text-white"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
        {/* Mobile slide-down menu */}
        {mobileMenuOpen && (
          <div className="border-t border-gray-800 md:hidden">
            <div className="flex flex-col py-2">
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="min-h-[44px] flex items-center px-4 text-gray-300 hover:bg-gray-800 hover:text-white"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="h-1 w-full bg-orange-500" />
    </nav>
  )
}
