import { cn } from '@/lib/utils'

export type BadgeTone = 'neutral' | 'orange' | 'win' | 'loss' | 'warn' | 'live'

const tones: Record<BadgeTone, string> = {
  neutral: 'border-line bg-ink-700 text-zinc-300',
  orange: 'border-orange-500/25 bg-orange-500/10 text-orange-400',
  win: 'border-win/20 bg-win/10 text-win',
  loss: 'border-loss/20 bg-loss/10 text-loss',
  warn: 'border-warn/20 bg-warn/10 text-warn',
  live: 'border-loss/20 bg-loss/10 text-loss',
}

const dots: Record<BadgeTone, string> = {
  neutral: 'bg-zinc-400',
  orange: 'bg-orange-500',
  win: 'bg-win',
  loss: 'bg-loss',
  warn: 'bg-warn',
  live: 'bg-loss animate-pulse',
}

interface BadgeProps {
  tone?: BadgeTone
  dot?: boolean
  className?: string
  children: React.ReactNode
}

export default function Badge({ tone = 'neutral', dot, className, children }: BadgeProps) {
  const t = tone
  const showDot = dot || t === 'live'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        tones[t],
        className
      )}
    >
      {showDot && <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dots[t])} />}
      {children}
    </span>
  )
}
