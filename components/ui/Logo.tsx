import { cn } from '@/lib/utils'

/** Brand mark: gradient tile with a trophy. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-500/25',
        className
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white" aria-hidden="true">
        <path
          d="M7 4h10v2.5a5 5 0 0 1-10 0V4z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M7 5H4.5v.75A3.25 3.25 0 0 0 7.75 9M17 5h2.5v.75A3.25 3.25 0 0 1 16.25 9"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path d="M12 11.5V15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path
          d="M9 19c0-1.5 1.3-2.5 3-2.5s3 1 3 2.5v1H9v-1z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

/** Wordmark: "Tech" in white, "ELO" in the accent gradient. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-display text-xl font-bold tracking-tight', className)}>
      <span className="text-white">Tech</span>{' '}
      <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
        ELO
      </span>
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
