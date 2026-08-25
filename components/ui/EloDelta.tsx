import { cn } from '@/lib/utils'

/** Small +12 / −8 rating-change chip (same look as MoneyDelta) */
export default function EloDelta({ delta, className }: { delta: number; className?: string }) {
  const positive = delta >= 0
  return (
    <span
      className={cn(
        'tabular inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-semibold',
        positive ? 'bg-win/10 text-win' : 'bg-loss/10 text-loss',
        className
      )}
    >
      {positive ? '+' : '−'}
      {Math.abs(delta)}
    </span>
  )
}
