import { cn } from '@/lib/utils'

/** Rank as a plain mono numeral. #1 is the only one in orange. */
export default function RankRing({ rank, size = 'sm', className }: { rank: number; size?: 'sm' | 'md'; className?: string }) {
  return (
    <span
      className={cn(
        'tabular inline-block shrink-0',
        size === 'sm' ? 'min-w-[1.5rem] text-sm' : 'min-w-[1.75rem] text-base',
        rank === 1 ? 'text-orange-400' : 'text-zinc-400',
        className
      )}
    >
      {rank}
    </span>
  )
}
