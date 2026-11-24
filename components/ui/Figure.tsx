import { cn } from '@/lib/utils'

interface FigureProps {
  label: React.ReactNode
  /** Right-aligned note on the label line, e.g. "#4 of 64" */
  aside?: React.ReactNode
  value: React.ReactNode
  tone?: 'default' | 'win' | 'loss' | 'muted'
  size?: 'md' | 'lg'
  /** Line(s) under the value: a sentence, a sparkline */
  children?: React.ReactNode
  className?: string
}

const tones = { default: 'text-white', win: 'text-win', loss: 'text-loss', muted: 'text-zinc-600' }

/** One headline number: label line, a large mono figure, and a quiet line under it */
export default function Figure({ label, aside, value, tone = 'default', size = 'md', children, className }: FigureProps) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="flex justify-between gap-3 text-[13px] text-mute">
        <span>{label}</span>
        {aside && <span>{aside}</span>}
      </p>
      <p className={cn('tabular mt-2 leading-none tracking-[-0.05em]', size === 'lg' ? 'text-[64px]' : 'text-5xl', tones[tone])}>{value}</p>
      {children && <div className="mt-2.5 text-[13px] text-zinc-400">{children}</div>}
    </div>
  )
}
