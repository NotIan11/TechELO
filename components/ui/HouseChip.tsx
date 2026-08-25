import { cn, getHouseColor } from '@/lib/utils'

/** Neutral chip identifying a house by its color dot */
export default function HouseChip({ name, className }: { name: string | null | undefined; className?: string }) {
  if (!name) {
    return <span className={cn('text-sm text-zinc-600', className)}>—</span>
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-line bg-ink-700 px-2.5 py-0.5 text-xs font-medium text-zinc-300',
        className
      )}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full ring-1 ring-white/20" style={{ backgroundColor: getHouseColor(name) }} />
      {name}
    </span>
  )
}
