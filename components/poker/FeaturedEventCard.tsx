import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import PokerStatusBadge from '@/components/ui/PokerStatusBadge'
import SponsorRow from './SponsorRow'
import { formatPokerDateTime } from '@/lib/poker/periods'
import { sessionTitle } from '@/lib/poker/stats'
import type { PokerSessionRow, PokerSponsorRow } from '@/lib/poker/types'

export interface FeaturedEvent extends PokerSessionRow {
  sponsors: PokerSponsorRow[]
}

/** Hub card for the next scheduled (or currently live) official tournament */
export default function FeaturedEventCard({ event }: { event: FeaturedEvent }) {
  const live = event.status === 'live'
  return (
    <Link
      href={`/poker/sessions/${event.id}`}
      className="group block overflow-hidden rounded-3xl border border-violet-400/25 bg-gradient-to-br from-violet-500/15 via-raise to-raise p-5 transition hover:border-violet-400/40 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge tone="poker" dot>
          Official Tech Poker tournament
        </Badge>
        <PokerStatusBadge status={event.status} />
      </div>
      <p className="mt-3 font-display text-2xl font-bold text-white group-hover:text-violet-200 sm:text-3xl">{sessionTitle(event)}</p>
      <p className="mt-1 text-sm text-slate-300">
        {live
          ? `Cards are in the air · ${event.player_count} players`
          : `${event.scheduled_for ? formatPokerDateTime(event.scheduled_for) : 'Date TBA'}${event.location ? ` · ${event.location}` : ''} · ${event.rsvp_count} RSVP${event.rsvp_count === 1 ? '' : 's'}`}
      </p>
      <SponsorRow sponsors={event.sponsors} size="sm" className="mt-4" />
      <p className="mt-4 text-sm font-semibold text-violet-200">{live ? 'Watch live →' : 'RSVP →'}</p>
    </Link>
  )
}
