import { cn } from '@/lib/utils'

/** Small +12 / −8 rating-change chip */
export default function EloDelta({ delta, className }: { delta: number; className?: string }) {
  const positive = delta >= 0
  return (
    <span
      className={cn(
        'tabular inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-bold',
        positive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300',
        className
      )}
    >
      {positive ? '+' : ''}
      {delta}
    </span>
  )
}
