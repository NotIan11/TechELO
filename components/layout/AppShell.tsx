import NavBar from './NavBar'
import { cn } from '@/lib/utils'

const widths = {
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  '7xl': 'max-w-7xl',
}

interface AppShellProps {
  children: React.ReactNode
  width?: keyof typeof widths
}

/** Standard page chrome: navbar + centered content + footer */
export default function AppShell({ children, width = '7xl' }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className={cn('mx-auto w-full flex-1 px-4 py-8 sm:px-6 lg:px-8', widths[width])}>
        {children}
      </main>
      <footer className="border-t border-white/[0.04] py-6">
        <p className="text-center text-xs text-zinc-600">
          Tech ELO — pool, ping pong &amp; poker rankings for the Houses
        </p>
      </footer>
    </div>
  )
}
