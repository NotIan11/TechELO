import Link from 'next/link'
import NavBar from './NavBar'
import CrossPromo, { type PromoKind } from './CrossPromo'
import { cn } from '@/lib/utils'

const widths = {
  md: 'max-w-md',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  '7xl': 'max-w-7xl',
}

interface AppShellProps {
  children: React.ReactNode
  width?: keyof typeof widths
  /** Which "other game" to nudge toward: table pages promote poker, poker pages promote tables */
  promo?: PromoKind | 'none'
}

/** Standard page chrome: navbar + centered content + cross-promo + footer. Server-only. */
export default async function AppShell({ children, width = '7xl', promo = 'poker' }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className={cn('mx-auto w-full flex-1 px-4 py-8 sm:px-6 lg:px-8', widths[width])}>{children}</main>
      {promo !== 'none' && (
        <div className={cn('mx-auto w-full px-4 pb-10 sm:px-6 lg:px-8', widths[width])}>
          <CrossPromo kind={promo} />
        </div>
      )}
      <footer className="border-t border-line py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-xs text-zinc-600 sm:flex-row sm:px-6 lg:px-8">
          <p>Tech ELO · Caltech house games</p>
          <nav className="flex gap-5">
            <Link href="/leaderboard" className="transition hover:text-zinc-300">
              Leaderboard
            </Link>
            <Link href="/poker" className="transition hover:text-zinc-300">
              Poker
            </Link>
            <Link href="/dorms" className="transition hover:text-zinc-300">
              Houses
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
