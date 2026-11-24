import { cn } from '@/lib/utils'

export type BadgeTone = 'neutral' | 'orange' | 'win' | 'loss' | 'warn' | 'live'

const tones: Record<BadgeTone, string> = {
  // Tags are plain coloured text with an optional dot: no fill, no outline
  neutral: 'text-zinc-400',
  orange: 'text-orange-400',
  win: 'text-win',
  loss: 'text-loss',
  warn: 'text-warn',
  live: 'text-loss',
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
        'inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-normal',
        tones[t],
        className
      )}
    >
      {showDot && <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dots[t])} />}
      {children}
    </span>
  )
}
