import Link from 'next/link'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import GameIcon from '@/components/ui/GameIcon'
import MoneyDelta from '@/components/ui/MoneyDelta'
import PokerStatusBadge from '@/components/ui/PokerStatusBadge'
import TimeAgo from '@/components/ui/TimeAgo'
import { formatCents } from '@/lib/poker/money'
import { formatPokerDateTime } from '@/lib/poker/periods'
import { binkOfTheNight, sessionTitle } from '@/lib/poker/stats'
import type { PlayerRef, PokerSessionRow } from '@/lib/poker/types'
import { cn } from '@/lib/utils'

export interface SessionListItem extends PokerSessionRow {
  host: PlayerRef | null
  entries: { user_id: string; net_cents: number; cash_out_cents: number | null; user: PlayerRef | null }[]
}

/** One row in a session list */
export default function SessionCard({ session, viewerId }: { session: SessionListItem; viewerId: string | null }) {
  const mine = viewerId ? session.entries.find((e) => e.user_id === viewerId) : null
  const counts = session.status === 'final' || session.status === 'disputed'
  const bink = counts ? binkOfTheNight(session.entries) : null
  const avatars = session.entries.slice(0, 5)
  const isTourney = session.kind === 'tournament'

  return (
    <Link
      href={`/poker/sessions/${session.id}`}
      className={cn(
        'card group flex items-center gap-4 p-4 transition hover:-translate-y-px hover:border-white/[0.14] sm:p-5',
        session.status === 'live' && 'border-red-400/30'
      )}
    >
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-poker">
        <GameIcon game="poker" className="h-6 w-6" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-white group-hover:text-orange-300">{sessionTitle(session)}</p>
          <Badge tone={isTourney ? 'purple' : 'poker'}>{isTourney ? (session.is_official ? 'Official' : 'Tournament') : 'Cash'}</Badge>
          <PokerStatusBadge status={session.status} acked={session.ack_count} total={session.player_count} />
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
          {session.status === 'scheduled' && session.scheduled_for ? (
            <span>{formatPokerDateTime(session.scheduled_for)}</span>
          ) : (
            <TimeAgo date={session.played_at} />
          )}
          <span>· {session.player_count} player{session.player_count === 1 ? '' : 's'}</span>
          {session.total_buy_in_cents > 0 && <span>· {formatCents(session.total_buy_in_cents, { compact: true })} in play</span>}
          {bink?.user && (
            <span className="hidden sm:inline">
              · <span className="text-emerald-300">{bink.user.display_name}</span> +{formatCents(bink.net_cents, { compact: true })}
            </span>
          )}
          {session.status === 'scheduled' && <span>· {session.rsvp_count} RSVP{session.rsvp_count === 1 ? '' : 's'}</span>}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {mine && counts && <MoneyDelta cents={mine.net_cents} chip compact />}
        <span className="hidden items-center -space-x-1.5 sm:flex">
          {avatars.map((e) => (
            <Avatar key={e.user_id} src={e.user?.profile_image_url} name={e.user?.display_name ?? '?'} size="xs" className="ring-2 ring-raise" />
          ))}
          {session.entries.length > 5 && (
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.08] text-[10px] font-semibold text-slate-300 ring-2 ring-raise">
              +{session.entries.length - 5}
            </span>
          )}
        </span>
        <svg className="h-4 w-4 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </div>
    </Link>
  )
}
