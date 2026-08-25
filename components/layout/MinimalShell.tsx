import Link from 'next/link'
import Logo from '@/components/ui/Logo'
import { cn } from '@/lib/utils'

interface MinimalShellProps {
  children: React.ReactNode
  /** Single right-hand text link in the header */
  link?: { href: string; label: string }
  className?: string
}

/** Chrome for auth, error and not-found pages: logo + one link, no nav, no footer. Client-safe. */
export default function MinimalShell({ children, link, className }: MinimalShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Tech ELO home">
          <Logo />
        </Link>
        {link && (
          <Link href={link.href} className="text-sm font-medium text-zinc-400 transition hover:text-white">
            {link.label}
          </Link>
        )}
      </header>
      <main className={cn('flex flex-1 flex-col items-center justify-center p-4 pb-16', className)}>{children}</main>
    </div>
  )
}
