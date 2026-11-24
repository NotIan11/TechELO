import Link from 'next/link'
import Logo from '@/components/ui/Logo'

interface AuthShellProps {
  /** The large statement on the left half */
  statement: string
  /** One sentence under the statement (wide screens only) */
  lede?: string
  /** Ruled row at the foot of the left half (wide screens only) */
  footer?: React.ReactNode
  /** Form title on the right half */
  title: string
  subtitle?: string
  /** The form */
  children: React.ReactNode
  /** One line under the form linking to the other screen */
  below?: React.ReactNode
}

/** 48px field used on the split auth screens */
export const AUTH_FIELD = 'input min-h-[48px] border-line-bright'
export const AUTH_LABEL = 'mb-1.5 block text-[13px] text-zinc-400'

/**
 * Split screen for sign in and join, with no nav. Left: logo, a statement, one
 * sentence and a ruled footer row. Right: the form. On narrow screens the left
 * half collapses to the logo and the statement above the form.
 */
export default function AuthShell({ statement, lede, footer, title, subtitle, children, below }: AuthShellProps) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <section className="flex min-w-0 flex-col gap-8 px-5 pt-6 sm:px-10 lg:flex-[1.2] lg:justify-between lg:gap-12 lg:border-r lg:border-line-strong lg:px-14 lg:pb-12 lg:pt-10">
        <Link href="/" aria-label="Tech ELO home" className="inline-flex min-h-[44px] items-center self-start">
          <Logo />
        </Link>
        <div>
          <p className="max-w-[520px] text-balance font-display text-[40px] font-normal leading-[1.05] tracking-[-0.04em] text-white lg:text-[64px] lg:leading-[1.02]">
            {statement}
          </p>
          {lede && <p className="mt-5 hidden max-w-[440px] text-base text-zinc-400 lg:block">{lede}</p>}
        </div>
        {/* Keeps the statement vertically centred between logo and footer even when the footer is empty */}
        <div className="hidden lg:block">{footer}</div>
      </section>

      <section className="flex min-w-0 flex-1 flex-col px-5 pb-16 pt-10 sm:px-10 lg:justify-center lg:px-14 lg:py-12">
        <div className="w-full max-w-[380px]">
          <h1 className="font-display text-[28px] font-normal tracking-[-0.02em] text-white">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-zinc-400">{subtitle}</p>}
          <div className="mt-7">{children}</div>
          {below && <p className="mt-6 border-t border-line-strong pt-5 text-sm text-zinc-400">{below}</p>}
        </div>
      </section>
    </div>
  )
}
