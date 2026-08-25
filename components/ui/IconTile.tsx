import { cn } from '@/lib/utils'

interface IconTileProps {
  icon: React.ReactNode
  size?: 'md' | 'lg'
  tone?: 'orange' | 'neutral'
  className?: string
}

/** Square tile holding a game/section icon (replaces the pasted icon squares) */
export default function IconTile({ icon, size = 'md', tone = 'orange', className }: IconTileProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg',
        size === 'md' ? 'h-10 w-10 [&>svg]:h-5 [&>svg]:w-5' : 'h-11 w-11 [&>svg]:h-6 [&>svg]:w-6',
        tone === 'orange' ? 'bg-orange-500/10 text-orange-400' : 'bg-ink-700 text-zinc-300',
        className
      )}
    >
      {icon}
    </span>
  )
}
