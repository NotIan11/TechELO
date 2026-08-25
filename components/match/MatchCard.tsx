import Link from 'next/link'
import { cn } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'
import StatusBadge from '@/components/ui/StatusBadge'
import EloDelta from '@/components/ui/EloDelta'
import GameIcon, { gameLabel } from '@/components/ui/GameIcon'
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

/** One row in a match list, shown from the viewer's perspective. */
export default function MatchCard({
  match,
  viewerId,
}: {
  match: MatchWithPlayers
  viewerId: string
}) {
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
    <Link
      href={`/matches/${match.id}`}
      className="card group flex items-center gap-4 p-4 transition hover:-translate-y-px hover:border-white/[0.14] sm:p-5"
    >
      <span
        className={cn(
          'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
          match.game_type === 'pool' ? 'bg-sky-400/10 text-pool' : 'bg-win/10 text-pong'
        )}
      >
        <GameIcon game={match.game_type} className="h-6 w-6" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-white group-hover:text-orange-400">
            vs {opponent.display_name}
          </p>
          <StatusBadge status={match.status} />
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          {gameLabel(match.game_type)} · <TimeAgo date={match.completed_at || match.created_at} />
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {completed && (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                won ? 'bg-win/20 text-win' : 'bg-loss/20 text-loss'
              )}
            >
              {won ? 'W' : 'L'}
            </span>
            {myDelta != null && <EloDelta delta={myDelta} />}
          </div>
        )}
        <Avatar src={opponent.profile_image_url} name={opponent.display_name} size="sm" className="hidden sm:block" />
        <svg
          className="h-4 w-4 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-zinc-400"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </div>
    </Link>
  )
}
