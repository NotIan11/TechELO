import Card from './Card'
import { cn } from '@/lib/utils'

export type StatTone = 'default' | 'positive' | 'negative' | 'pool' | 'pong' | 'poker' | 'muted'

const valueTones: Record<StatTone, string> = {
  default: 'text-white',
  positive: 'text-win',
  negative: 'text-loss',
  pool: 'text-pool',
  pong: 'text-pong',
  poker: 'text-poker',
  muted: 'text-zinc-400',
}

interface StatTileProps {
  label: string
  value: React.ReactNode
  /** Small line under the value */
  sub?: React.ReactNode
  tone?: StatTone
  size?: 'md' | 'lg'
  className?: string
}

/** Label-over-value tile used in stat grids */
export default function StatTile({ label, value, sub, tone = 'default', size = 'md', className }: StatTileProps) {
  return (
    <Card padding="sm" className={cn('min-w-0', className)}>
      <p className="truncate eyebrow">{label}</p>
      <p
        className={cn(
          'tabular mt-1 truncate font-display font-bold',
          size === 'lg' ? 'text-3xl' : 'text-2xl',
          valueTones[tone]
        )}
      >
        {value}
      </p>
      {sub != null && <p className="mt-0.5 truncate text-xs text-zinc-500">{sub}</p>}
    </Card>
  )
}
