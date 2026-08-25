'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Button from '@/components/ui/Button'
import { ChipToggle } from '@/components/ui/ChipSelect'
import EmptyState from '@/components/ui/EmptyState'
import GameIcon from '@/components/ui/GameIcon'
import Pagination from '@/components/ui/Pagination'
import SectionHeader from '@/components/ui/SectionHeader'
import Segmented from '@/components/ui/Segmented'
import TextLink from '@/components/ui/TextLink'
import SessionCard, { type SessionListItem } from './SessionCard'
import type { PokerKindFilter } from '@/lib/poker/types'

interface SessionsListClientProps {
  live: SessionListItem[]
  sessions: SessionListItem[]
  kind: PokerKindFilter
  mine: boolean
  currentPage: number
  totalPages: number
  viewerId: string | null
}

export default function SessionsListClient({ live, sessions, kind, mine, currentPage, totalPages, viewerId }: SessionsListClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    const qs = params.toString()
    router.push(`/poker/sessions${qs ? `?${qs}` : ''}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<PokerKindFilter>
          value={kind}
          onChange={(v) => updateParams({ kind: v === 'all' ? null : v, page: null })}
          options={[
            { value: 'all', label: 'All' },
            { value: 'cash', label: 'Cash' },
            { value: 'tournament', label: 'Tournaments' },
          ]}
        />
        {viewerId && (
          <ChipToggle pressed={mine} onClick={() => updateParams({ mine: mine ? null : '1', page: null })}>
            Sessions I played
          </ChipToggle>
        )}
      </div>

      {live.length > 0 && (
        <section>
          <SectionHeader title="Live now" />
          <div className="space-y-3">
            {live.map((s) => (
              <SessionCard key={s.id} session={s} viewerId={viewerId} />
            ))}
          </div>
        </section>
      )}

      {sessions.length === 0 ? (
        <EmptyState
          icon={<GameIcon game="poker" />}
          title={mine ? 'No sessions with you in them yet' : 'No sessions logged yet'}
          description="Start a game. The ledger fills in as the night goes."
          action={viewerId ? <Button href="/poker/sessions/new">Start a session</Button> : <Button href="/signup">Join</Button>}
        />
      ) : (
        <section>
          {live.length > 0 && <SectionHeader title="History" />}
          <div className="space-y-3">
            {sessions.map((s) => (
              <SessionCard key={s.id} session={s} viewerId={viewerId} />
            ))}
          </div>
        </section>
      )}

      <Pagination page={currentPage} totalPages={totalPages} onPage={(p) => updateParams({ page: String(p) })} />

      <p className="text-[13px] text-zinc-400">
        Money settled. Now settle the rating.{' '}
        <TextLink href="/matches/new" arrow="right" className="text-[13px]">
          Challenge someone
        </TextLink>
      </p>
    </div>
  )
}
