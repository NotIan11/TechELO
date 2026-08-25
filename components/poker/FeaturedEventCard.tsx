import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import PokerStatusBadge from '@/components/ui/PokerStatusBadge'
import SponsorRow from './SponsorRow'
import { formatPokerDateTime } from '@/lib/poker/periods'
import { sessionTitle } from '@/lib/poker/stats'
import type { PokerSessionRow, PokerSponsorRow } from '@/lib/poker/types'

export interface FeaturedEvent extends PokerSessionRow {
  sponsors: PokerSponsorRow[]
}

/** Compact hub row for the next scheduled (or live) official tournament */
export default function FeaturedEventCard({ event }: { event: FeaturedEvent }) {
  const live = event.status === 'live'
  const href = `/poker/sessions/${event.id}`
  return (
    <div className="card relative overflow-hidden p-5 sm:p-6">
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-orange-500" />
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="orange" dot>
              Official tournament
            </Badge>
            <PokerStatusBadge status={event.status} />
          </div>
          <Link href={href} className="mt-2 block font-display text-xl font-bold tracking-tight text-white transition hover:text-orange-400 sm:text-2xl">
            {sessionTitle(event)}
          </Link>
          <p className="tabular mt-1 text-sm text-zinc-400">
            {live
              ? `Cards are in the air · ${event.player_count} players`
              : `${event.scheduled_for ? formatPokerDateTime(event.scheduled_for) : 'Date TBA'}${event.location ? ` · ${event.location}` : ''} · ${event.rsvp_count} RSVP${event.rsvp_count === 1 ? '' : 's'}`}
          </p>
          <SponsorRow sponsors={event.sponsors} size="sm" className="mt-3" />
        </div>
        <Button href={href} className="md:shrink-0">
          {live ? 'Watch live' : 'RSVP'}
        </Button>
      </div>
    </div>
  )
}
