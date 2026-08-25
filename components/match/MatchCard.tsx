import Avatar from '@/components/ui/Avatar'
import EloDelta from '@/components/ui/EloDelta'
import GameIcon, { gameLabel } from '@/components/ui/GameIcon'
import IconTile from '@/components/ui/IconTile'
import ListRow from '@/components/ui/ListRow'
import StatusBadge from '@/components/ui/StatusBadge'
import TimeAgo from '@/components/ui/TimeAgo'
import { cn } from '@/lib/utils'

interface PlayerRef {
  id: string
  display_name: string
  profile_image_url?: string | null
}

export interface MatchWithPlayers {
  id: string
  game_type: string
  status: string
  player1_id: string
  player2_id: string
  winner_id: string | null
  player1_elo_before: number | null
  player2_elo_before: number | null
  player1_elo_after: number | null
  player2_elo_after: number | null
  created_at: string
  completed_at: string | null
  player1: PlayerRef
  player2: PlayerRef
}

/** One row in a match list, shown from the viewer's perspective. */
export default function MatchCard({ match, viewerId }: { match: MatchWithPlayers; viewerId: string }) {
  const isPlayer1 = match.player1_id === viewerId
  const opponent = isPlayer1 ? match.player2 : match.player1
  const completed = match.status === 'completed' && match.winner_id != null
  const won = completed && match.winner_id === viewerId
  const myDelta = completed
    ? isPlayer1
      ? (match.player1_elo_after ?? 0) - (match.player1_elo_before ?? 0)
      : (match.player2_elo_after ?? 0) - (match.player2_elo_before ?? 0)
    : null

  return (
    <ListRow
      href={`/matches/${match.id}`}
      leading={<IconTile icon={<GameIcon game={match.game_type} />} size="lg" />}
      title={`vs ${opponent.display_name}`}
      badges={<StatusBadge status={match.status} />}
      meta={
        <span>
          {gameLabel(match.game_type)} · <TimeAgo date={match.completed_at || match.created_at} />
        </span>
      }
      trailing={
        <>
          {completed && (
            <div className="flex items-center gap-2">
              <span className={cn('inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold', won ? 'bg-win/20 text-win' : 'bg-loss/20 text-loss')}>
                {won ? 'W' : 'L'}
              </span>
              {myDelta != null && <EloDelta delta={myDelta} />}
            </div>
          )}
          <Avatar src={opponent.profile_image_url} name={opponent.display_name} size="sm" className="hidden sm:block" />
        </>
      }
    />
  )
}
