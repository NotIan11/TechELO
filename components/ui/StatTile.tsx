import Card from './Card'
import { cn } from '@/lib/utils'

export type StatTone = 'default' | 'win' | 'loss' | 'orange' | 'muted'
/** @deprecated legacy tone names — removed in the cleanup phase */
type LegacyStatTone = 'positive' | 'negative' | 'pool' | 'pong' | 'poker'

const ALIAS: Record<LegacyStatTone, StatTone> = {
  positive: 'win',
  negative: 'loss',
  pool: 'default',
  pong: 'default',
  poker: 'orange',
}

const valueTones: Record<StatTone, string> = {
  default: 'text-white',
  win: 'text-win',
  loss: 'text-loss',
  orange: 'text-orange-400',
  muted: 'text-zinc-500',
}

const sizes = { sm: 'text-lg', md: 'text-2xl', lg: 'text-3xl' }

interface StatTileProps {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  tone?: StatTone | LegacyStatTone
  size?: 'sm' | 'md' | 'lg'
  /** No card surface — for mini stats inside another card */
  bare?: boolean
  className?: string
}

/** Label-over-value tile used in stat grids */
export default function StatTile({ label, value, sub, tone = 'default', size = 'md', bare, className }: StatTileProps) {
  const t: StatTone = tone in ALIAS ? ALIAS[tone as LegacyStatTone] : (tone as StatTone)
  const body = (
    <>
      <p className="eyebrow truncate">{label}</p>
      <p className={cn('tabular mt-1 truncate font-display font-bold tracking-tight', sizes[size], valueTones[t])}>{value}</p>
      {sub != null && <p className="mt-0.5 truncate text-xs text-zinc-500">{sub}</p>}
    </>
  )
  if (bare) return <div className={cn('min-w-0', className)}>{body}</div>
  return (
    <Card padding="sm" className={cn('min-w-0', className)}>
      {body}
    </Card>
  )
}
