import { cn } from '@/lib/utils'

export type BannerTone = 'error' | 'success' | 'warning' | 'info'

const tones: Record<BannerTone, string> = {
  error: 'border-loss/20 bg-loss/10 text-loss',
  success: 'border-win/20 bg-win/10 text-win animate-fade-up',
  warning: 'border-warn/20 bg-warn/10 text-warn',
  info: 'border-sky-500/25 bg-sky-500/10 text-sky-200',
}

interface BannerProps {
  tone: BannerTone
  children: React.ReactNode
  /** Right-aligned action (button/link) */
  action?: React.ReactNode
  compact?: boolean
  className?: string
}

/** Inline status banner (replaces the ad-hoc rounded-xl error/success boxes) */
export default function Banner({ tone, children, action, compact, className }: BannerProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-xl border text-sm',
        compact ? 'px-3 py-2' : 'p-4',
        tones[tone],
        className
      )}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
