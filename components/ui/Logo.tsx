import { cn } from '@/lib/utils'

/** Brand mark: an orange disc with one black ring — a ball and a chip at once. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-8 w-8 shrink-0', className)} aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#FF6C0C" />
      <circle cx="12" cy="12" r="5.5" fill="none" stroke="#0b0b0c" strokeWidth="2.5" />
    </svg>
  )
}

/** Wordmark: plain white, display face. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-display text-xl font-bold tracking-tight text-white', className)}>
      Tech ELO
    </span>
  )
}

export default function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <Wordmark />
    </span>
  )
}
