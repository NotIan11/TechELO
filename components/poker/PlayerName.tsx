import Link from 'next/link'
import HouseChip from '@/components/ui/HouseChip'
import { cn } from '@/lib/utils'
import type { PlayerRefWithHouse } from '@/lib/poker/types'

interface PlayerNameProps {
  player: PlayerRefWithHouse | null
  isMe?: boolean
  /** Extra quiet tag after the name, e.g. "host" */
  tag?: string | null
  /** Link to the profile (default) or render inline text only */
  href?: boolean
  showHouse?: boolean
  className?: string
}

/** A name with its small tags ("you" in orange, "host" / "guest" in grey). Links to the profile when the player has an account. */
export default function PlayerName({ player, isMe, tag, href = true, showHouse, className }: PlayerNameProps) {
  const name = player?.display_name ?? 'Unknown'
  const isGuest = !!player?.guest
  const inner = (
    <>
      <span className={cn('truncate text-[15px] text-white', href && player && !isGuest && 'underline-offset-4 group-hover/name:underline')}>{name}</span>
      {isMe && <span className="shrink-0 text-xs text-orange-400">you</span>}
      {tag && <span className="shrink-0 text-xs text-mute">{tag}</span>}
      {isGuest && (
        <span className="shrink-0 text-xs text-mute" title="No account yet">
          guest
        </span>
      )}
      {showHouse && player?.dorm_name && <HouseChip name={player.dorm_name} className="shrink-0" />}
    </>
  )
  const classes = cn('inline-flex min-w-0 items-baseline gap-2', className)
  if (href && player && !isGuest) {
    return (
      <Link href={`/profile/${player.id}`} className={cn(classes, 'group/name')}>
        {inner}
      </Link>
    )
  }
  return <span className={classes}>{inner}</span>
}
