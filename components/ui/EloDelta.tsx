import { cn } from '@/lib/utils'

/** Small +12 / −8 rating-change chip (same look as MoneyDelta) */
export default function EloDelta({ delta, className }: { delta: number; className?: string }) {
  const positive = delta >= 0
  return (
    <span
      className={cn(
        'tabular inline-flex items-center text-sm',
        positive ? 'text-win' : 'text-loss',
        className
      )}
    >
      {positive ? '+' : '−'}
      {Math.abs(delta)}
    </span>
  )
}
