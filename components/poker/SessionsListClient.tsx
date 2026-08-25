'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import GameIcon from '@/components/ui/GameIcon'
import Segmented from '@/components/ui/Segmented'
import SessionCard, { type SessionListItem } from './SessionCard'
import type { PokerKindFilter } from '@/lib/poker/types'
import { cn } from '@/lib/utils'

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
          <button
            type="button"
            aria-pressed={mine}
            onClick={() => updateParams({ mine: mine ? null : '1', page: null })}
            className={cn(
              'inline-flex min-h-[38px] items-center rounded-xl border px-4 text-sm font-medium transition',
              mine ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-line bg-ink-700 text-zinc-300 hover:bg-white/[0.08]'
            )}
          >
            Sessions I played
          </button>
        )}
      </div>

      {live.length > 0 && (
        <section>
          <h2 className="mb-3 eyebrow">Live now</h2>
          <div className="space-y-3">
            {live.map((s) => (
              <SessionCard key={s.id} session={s} viewerId={viewerId} />
            ))}
          </div>
        </section>
      )}

      {sessions.length === 0 ? (
        <EmptyState
          icon={<GameIcon game="poker" className="h-10 w-10 text-zinc-500" />}
          title={mine ? 'No sessions with you in them yet' : 'No sessions logged yet'}
          description="Start a game and the ledger builds itself as the night goes."
          action={viewerId ? <Button href="/poker/sessions/new">Start a session</Button> : <Button href="/signup">Join to play</Button>}
        />
      ) : (
        <section>
          {live.length > 0 && <h2 className="mb-3 eyebrow">History</h2>}
          <div className="space-y-3">
            {sessions.map((s) => (
              <SessionCard key={s.id} session={s} viewerId={viewerId} />
            ))}
          </div>
        </section>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="secondary" size="sm" disabled={currentPage === 1} onClick={() => updateParams({ page: String(currentPage - 1) })}>
            ← Previous
          </Button>
          <p className="tabular text-sm text-zinc-400">
            Page {currentPage} of {totalPages}
          </p>
          <Button variant="secondary" size="sm" disabled={currentPage === totalPages} onClick={() => updateParams({ page: String(currentPage + 1) })}>
            Next →
          </Button>
        </div>
      )}
    </div>
  )
}
