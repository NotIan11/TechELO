import Link from 'next/link'
import Avatar from '@/components/ui/Avatar'
import HouseChip from '@/components/ui/HouseChip'
import { cn } from '@/lib/utils'
import type { PlayerRefWithHouse } from '@/lib/poker/types'

interface PlayerNameProps {
  player: PlayerRefWithHouse | null
  isMe?: boolean
  size?: 'xs' | 'sm' | 'md'
  /** Link to the profile (default) or render inline text only */
  href?: boolean
  showHouse?: boolean
  className?: string
}

/** Avatar + name (+ "you" marker), linking to the player's profile */
export default function PlayerName({ player, isMe, size = 'sm', href = true, showHouse, className }: PlayerNameProps) {
  const name = player?.display_name ?? 'Unknown'
  const inner = (
    <>
      <Avatar src={player?.profile_image_url} name={name} size={size} />
      <span className="min-w-0">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium text-white">{name}</span>
          {isMe && <span className="shrink-0 text-xs text-orange-400">you</span>}
        </span>
        {showHouse && player?.dorm_name && (
          <span className="mt-0.5 block">
            <HouseChip name={player.dorm_name} />
          </span>
        )}
      </span>
    </>
  )
  const classes = cn('inline-flex min-w-0 items-center gap-2.5', className)
  if (href && player) {
    return (
      <Link href={`/profile/${player.id}`} className={cn(classes, 'group/name hover:opacity-90')}>
        {inner}
      </Link>
    )
  }
  return <span className={classes}>{inner}</span>
}
