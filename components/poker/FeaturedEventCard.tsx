import Link from 'next/link'
import Button from '@/components/ui/Button'
import SponsorRow from './SponsorRow'
import { formatPokerDateTime } from '@/lib/poker/periods'
import { sessionTitle } from '@/lib/poker/stats'
import type { PokerSessionRow, PokerSponsorRow } from '@/lib/poker/types'

export interface FeaturedEvent extends PokerSessionRow {
  sponsors: PokerSponsorRow[]
}

/** Right-rail block for the next scheduled (or live) official tournament */
export default function FeaturedEventCard({ event }: { event: FeaturedEvent }) {
  const live = event.status === 'live'
  const href = `/poker/sessions/${event.id}`
  return (
    <div className="border-b border-line pb-5">
      <p className="text-xs text-mute">{live ? 'Official tournament, live now' : 'Next official tournament'}</p>
      <Link href={href} className="mt-1.5 block font-display text-xl leading-tight tracking-tight text-white transition hover:text-zinc-300">
        {sessionTitle(event)}
      </Link>
      <p className="mt-1 text-[13px] text-zinc-400">
        {live ? (
          <>
            Cards are in the air · <span className="tabular">{event.player_count}</span> playing
          </>
        ) : (
          <>
            <span className="tabular">{event.scheduled_for ? formatPokerDateTime(event.scheduled_for) : 'Date to be announced'}</span>
            {event.location ? ` · ${event.location}` : ''} · free entry · <span className="tabular">{event.rsvp_count}</span> going
          </>
        )}
      </p>
      <Button href={href} variant="outline" className="mt-3.5">
        {live ? 'Watch live' : 'RSVP'}
      </Button>
      <SponsorRow sponsors={event.sponsors} size="sm" className="mt-4" />
    </div>
  )
}
