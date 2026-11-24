import { cn, getHouseColor } from '@/lib/utils'

/** A house named in plain text beside a small square of its colour */
export default function HouseChip({ name, className }: { name: string | null | undefined; className?: string }) {
  if (!name) {
    return <span className={cn('text-xs text-zinc-600', className)}>—</span>
  }
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-mute', className)}>
      <span className="h-2 w-2 shrink-0 ring-1 ring-white/30" style={{ backgroundColor: getHouseColor(name) }} />
      {name}
    </span>
  )
}
