import { cn } from '@/lib/utils'

/**
 * A value drawn either side of a zero line: losses extend left in red, gains
 * right in green. `max` is the largest absolute value in the set.
 */
export default function DivergingBar({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.max(2, Math.round((Math.abs(value) / max) * 100)) : 0
  return (
    <span className={cn('flex h-5 items-center', className)} aria-hidden="true">
      <span className="flex flex-1 justify-end">{value < 0 && <span className="h-2 bg-loss" style={{ width: `${pct}%` }} />}</span>
      <span className="h-5 w-px bg-white/40" />
      <span className="flex flex-1">{value > 0 && <span className="h-2 bg-win" style={{ width: `${pct}%` }} />}</span>
    </span>
  )
}
