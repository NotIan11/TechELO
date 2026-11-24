import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import type { SessionListItem } from './SessionCard'
import { formatCents } from '@/lib/poker/money'
import { TIME_ZONE } from '@/lib/poker/periods'
import { plural } from '@/lib/poker/phrases'
import { sessionTitle } from '@/lib/poker/stats'

/** Right-rail panel for a table that is open right now: red hairline outline, no fill */
export default function LiveNowPanel({ session, viewerId }: { session: SessionListItem; viewerId: string | null }) {
  const mine = viewerId ? session.entries.find((e) => e.user_id === viewerId) : null
  const onTable = Number(session.total_buy_in_cents) - Number(session.total_cash_out_cents)
  const started = session.started_at
    ? new Date(session.started_at).toLocaleTimeString('en-US', { timeZone: TIME_ZONE, hour: 'numeric', minute: '2-digit' })
    : null
  return (
    <Link href={`/poker/sessions/${session.id}`} className="block rounded border border-loss/50 p-[18px] transition hover:border-loss">
      <span className="flex justify-between gap-3 text-xs">
        <Badge tone="live">Live now</Badge>
        {started && <span className="text-mute">started {started}</span>}
      </span>
      <span className="mt-2 block font-display text-xl tracking-tight text-white">{sessionTitle(session)}</span>
      <span className="mt-1 block text-[13px] text-zinc-400">
        <span className="tabular">{session.player_count}</span> {plural(session.player_count, 'player')} · <span className="tabular">{formatCents(onTable, { compact: true })}</span> on the table
        {mine && (
          <>
            {' '}
            · you are in for <span className="tabular">{formatCents(mine.buy_in_cents, { compact: true })}</span>
          </>
        )}
      </span>
    </Link>
  )
}
