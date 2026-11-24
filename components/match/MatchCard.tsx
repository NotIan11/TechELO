import EloDelta from '@/components/ui/EloDelta'
import { gameLabel } from '@/components/ui/GameIcon'
import ListRow from '@/components/ui/ListRow'
import StatusBadge from '@/components/ui/StatusBadge'
import TimeAgo from '@/components/ui/TimeAgo'

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

/** One ruled row in a match list, shown from the viewer's perspective. */
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
  const myAfter = completed ? (isPlayer1 ? match.player1_elo_after : match.player2_elo_after) : null

  return (
    <ListRow
      href={`/matches/${match.id}`}
      title={`${completed ? (won ? 'Beat' : 'Lost to') : 'Against'} ${opponent.display_name}`}
      badges={!completed && <StatusBadge status={match.status} />}
      meta={
        <span>
          {gameLabel(match.game_type) === 'Ping Pong' ? 'Ping pong' : gameLabel(match.game_type)} · <TimeAgo date={match.completed_at || match.created_at} />
        </span>
      }
      trailing={
        completed && (
          <span className="flex items-baseline gap-3">
            {myDelta != null && <EloDelta delta={myDelta} />}
            {myAfter != null && <span className="tabular text-sm text-white">{myAfter}</span>}
          </span>
        )
      }
    />
  )
}
