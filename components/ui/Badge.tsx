import { cn } from '@/lib/utils'

export type BadgeTone =
  | 'gray'
  | 'green'
  | 'red'
  | 'yellow'
  | 'blue'
  | 'purple'
  | 'orange'

const tones: Record<BadgeTone, string> = {
  gray: 'bg-slate-500/15 text-slate-300 border-slate-400/20',
  green: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/20',
  red: 'bg-red-500/15 text-red-300 border-red-400/20',
  yellow: 'bg-amber-500/15 text-amber-300 border-amber-400/20',
  blue: 'bg-sky-500/15 text-sky-300 border-sky-400/20',
  purple: 'bg-purple-500/15 text-purple-300 border-purple-400/20',
  orange: 'bg-orange-500/15 text-orange-300 border-orange-400/20',
}

const dots: Record<BadgeTone, string> = {
  gray: 'bg-slate-400',
  green: 'bg-emerald-400',
  red: 'bg-red-400',
  yellow: 'bg-amber-400',
  blue: 'bg-sky-400',
  purple: 'bg-purple-400',
  orange: 'bg-orange-400',
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
