import { Suspense } from 'react'
import NavBar from './NavBar'
import { cn } from '@/lib/utils'

const widths = {
  md: 'max-w-md',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-[1040px]',
  '7xl': 'max-w-7xl',
}

interface AppShellProps {
  children: React.ReactNode
  width?: keyof typeof widths
  /** Accepted for older call sites; the cross-promo strip is gone, so this does nothing. */
  promo?: 'poker' | 'tables' | 'none'
}

/** Standard page chrome: nav bar + centered content. No footer, no cross-promo. Server-only. */
export default async function AppShell({ children, width = '7xl' }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={<div className="h-[61px] border-b border-line" />}>
        <NavBar />
      </Suspense>
      <main className={cn('mx-auto w-full flex-1 px-4 pb-16 pt-10 sm:px-6 sm:pt-14 lg:px-8', widths[width])}>{children}</main>
    </div>
  )
}
