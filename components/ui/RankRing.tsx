import { cn } from '@/lib/utils'

const RING = ['border-orange-500 text-orange-400', 'border-zinc-300 text-zinc-200', 'border-zinc-500 text-zinc-400']

/** Small outlined rank badge: #1 orange, #2 light, #3 grey, rest neutral */
export default function RankRing({ rank, size = 'sm', className }: { rank: number; size?: 'sm' | 'md'; className?: string }) {
  return (
    <span
      className={cn(
        'tabular inline-flex shrink-0 items-center justify-center rounded-full border-2 font-display font-bold',
        size === 'sm' ? 'h-6 w-6 text-[11px]' : 'h-7 w-7 text-xs',
        RING[rank - 1] ?? 'border-line-strong text-zinc-500',
        className
      )}
    >
      {rank}
    </span>
  )
}
