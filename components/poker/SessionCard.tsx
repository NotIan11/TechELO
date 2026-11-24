import Link from 'next/link'
import MoneyDelta from '@/components/ui/MoneyDelta'
import TimeAgo from '@/components/ui/TimeAgo'
import { LEDGER_TONE_CLASS, ledgerState, plural } from '@/lib/poker/phrases'
import { formatPokerDateTime } from '@/lib/poker/periods'
import { sessionTitle } from '@/lib/poker/stats'
import type { PlayerRef, PokerSessionRow } from '@/lib/poker/types'
import { cn } from '@/lib/utils'

export interface SessionListItem extends PokerSessionRow {
  host: PlayerRef | null
  entries: {
    id: string
    user_id: string | null
    guest_id: string | null
    buy_in_cents: number
    net_cents: number
    cash_out_cents: number | null
    acknowledged_at: string | null
    disputed_at: string | null
    user: PlayerRef | null
    guest: { id: string; name: string } | null
  }[]
}

/** Compact ruled row for a session: title, "when · players · ledger state", and the viewer's net */
export default function SessionCard({ session, viewerId }: { session: SessionListItem; viewerId: string | null }) {
  const mine = viewerId ? session.entries.find((e) => e.user_id === viewerId) : null
  const counts = session.status === 'final' || session.status === 'disputed'
  const state = ledgerState(session, viewerId)

  return (
    <Link
      href={`/poker/sessions/${session.id}`}
      className={cn('flex min-h-[44px] items-baseline gap-3 border-b border-line py-3 transition hover:border-line-bright', state.dim && 'opacity-50')}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-white">{sessionTitle(session)}</span>
        <span className="block text-xs text-mute">
          {session.status === 'scheduled' && session.scheduled_for ? formatPokerDateTime(session.scheduled_for) : <TimeAgo date={session.played_at} />}
          {' · '}
          <span className="tabular">{session.player_count}</span> {plural(session.player_count, 'player')}
          {' · '}
          <span className={LEDGER_TONE_CLASS[state.tone]}>{state.text.charAt(0).toLowerCase() + state.text.slice(1)}</span>
        </span>
      </span>
      {mine && counts && <MoneyDelta cents={mine.net_cents} compact />}
    </Link>
  )
}
