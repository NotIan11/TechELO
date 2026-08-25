import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import GameIcon from '@/components/ui/GameIcon'
import IconTile from '@/components/ui/IconTile'
import ListRow from '@/components/ui/ListRow'
import MoneyDelta from '@/components/ui/MoneyDelta'
import PokerStatusBadge from '@/components/ui/PokerStatusBadge'
import TimeAgo from '@/components/ui/TimeAgo'
import { formatCents } from '@/lib/poker/money'
import { formatPokerDateTime } from '@/lib/poker/periods'
import { binkOfTheNight, sessionTitle } from '@/lib/poker/stats'
import type { PlayerRef, PokerSessionRow } from '@/lib/poker/types'

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
    <ListRow
      href={`/poker/sessions/${session.id}`}
      tone={session.status === 'live' ? 'live' : 'default'}
      leading={<IconTile icon={<GameIcon game="poker" />} size="lg" />}
      title={sessionTitle(session)}
      badges={
        <>
          <Badge tone="orange">{isTourney ? (session.is_official ? 'Official' : 'Tournament') : 'Cash'}</Badge>
          <PokerStatusBadge status={session.status} acked={session.ack_count} total={session.player_count} />
        </>
      }
      meta={
        <>
          {session.status === 'scheduled' && session.scheduled_for ? <span>{formatPokerDateTime(session.scheduled_for)}</span> : <TimeAgo date={session.played_at} />}
          <span>
            · {session.player_count} player{session.player_count === 1 ? '' : 's'}
          </span>
          {session.total_buy_in_cents > 0 && <span>· {formatCents(session.total_buy_in_cents, { compact: true })} in play</span>}
          {bink?.user && (
            <span className="hidden sm:inline">
              · <span className="text-win">{bink.user.display_name}</span> +{formatCents(bink.net_cents, { compact: true })}
            </span>
          )}
          {session.status === 'scheduled' && (
            <span>
              · {session.rsvp_count} RSVP{session.rsvp_count === 1 ? '' : 's'}
            </span>
          )}
        </>
      }
      trailing={
        <>
          {mine && counts && <MoneyDelta cents={mine.net_cents} chip compact />}
          <span className="hidden items-center -space-x-1.5 sm:flex">
            {avatars.map((e) => (
              <Avatar key={e.user_id} src={e.user?.profile_image_url} name={e.user?.display_name ?? '?'} size="xs" className="ring-2 ring-ink-800" />
            ))}
            {session.entries.length > 5 && (
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-ink-600 text-[10px] font-semibold text-zinc-300 ring-2 ring-ink-800">
                +{session.entries.length - 5}
              </span>
            )}
          </span>
        </>
      }
    />
  )
}
