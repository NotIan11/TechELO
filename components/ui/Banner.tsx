import { cn } from '@/lib/utils'

export type BannerTone = 'error' | 'success' | 'warning' | 'info'

const tones: Record<BannerTone, string> = {
  error: 'border-loss/50 text-loss',
  success: 'border-win/50 text-win animate-fade-up',
  warning: 'border-warn/50 text-warn',
  info: 'border-line-bright text-zinc-200',
}

interface BannerProps {
  tone: BannerTone
  children: React.ReactNode
  /** Right-aligned action (button/link) */
  action?: React.ReactNode
  compact?: boolean
  className?: string
}

/** Inline status banner */
export default function Banner({ tone, children, action, compact, className }: BannerProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded border text-sm',
        compact ? 'px-3 py-2' : 'px-4 py-3',
        tones[tone],
        className
      )}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
