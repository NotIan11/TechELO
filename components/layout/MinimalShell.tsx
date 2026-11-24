import Link from 'next/link'
import Logo from '@/components/ui/Logo'
import { cn } from '@/lib/utils'

interface MinimalShellProps {
  children?: React.ReactNode
  /** Single right-hand text link in the header */
  link?: { href: string; label: string }
  /** Small grey line above the title (a status code, a step) */
  kicker?: React.ReactNode
  /** Left-aligned, regular-weight page title */
  title?: React.ReactNode
  /** One sentence under the title */
  lede?: React.ReactNode
  className?: string
}

/**
 * Chrome for the set-password, confirm, error and not-found pages: the logo,
 * then a left-aligned title, one sentence, and the form or buttons. No nav, no
 * footer. Client-safe.
 */
export default function MinimalShell({ children, link, kicker, title, lede, className }: MinimalShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex h-[60px] w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Tech ELO home" className="inline-flex min-h-[44px] items-center">
          <Logo />
        </Link>
        {link && (
          <Link href={link.href} className="inline-flex min-h-[44px] items-center text-sm text-zinc-400 transition hover:text-white">
            {link.label}
          </Link>
        )}
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-12 sm:px-6 sm:pt-24 lg:px-8">
        <div className={cn('max-w-[440px]', className)}>
          {kicker && <p className="mb-2.5 text-[13px] text-mute">{kicker}</p>}
          {title && <h1 className="text-balance font-display text-4xl font-normal tracking-[-0.03em] text-white sm:text-[44px] sm:leading-[1.1]">{title}</h1>}
          {lede && <p className="mt-3 text-[15px] text-zinc-400">{lede}</p>}
          {children && <div className={cn((title || lede) && 'mt-8')}>{children}</div>}
        </div>
      </main>
    </div>
  )
}
