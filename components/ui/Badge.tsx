import { cn } from '@/lib/utils'

export type BadgeTone =
  | 'gray'
  | 'green'
  | 'red'
  | 'yellow'
  | 'blue'
  | 'purple'
  | 'orange'
  | 'poker'

const tones: Record<BadgeTone, string> = {
  gray: 'bg-zinc-500/15 text-zinc-300 border-zinc-400/20',
  green: 'bg-win/10 text-win border-win/20',
  red: 'bg-loss/10 text-loss border-loss/20',
  yellow: 'bg-warn/10 text-warn border-warn/20',
  blue: 'bg-sky-500/15 text-sky-300 border-sky-400/20',
  purple: 'bg-purple-500/15 text-purple-300 border-purple-400/20',
  orange: 'bg-orange-500/15 text-orange-400 border-orange-500/40',
  poker: 'bg-violet-500/15 text-violet-300 border-violet-400/20',
}

const dots: Record<BadgeTone, string> = {
  gray: 'bg-zinc-400',
  green: 'bg-emerald-400',
  red: 'bg-loss',
  yellow: 'bg-warn',
  blue: 'bg-sky-400',
  purple: 'bg-purple-400',
  orange: 'bg-orange-500',
  poker: 'bg-violet-400',
}

interface BadgeProps {
  tone?: BadgeTone
  dot?: boolean
  className?: string
  children: React.ReactNode
}

export default function Badge({ tone = 'gray', dot, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        tones[tone],
        className
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dots[tone])} />}
      {children}
    </span>
  )
}
