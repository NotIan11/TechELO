'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import MoneyDelta from '@/components/ui/MoneyDelta'
import Pagination from '@/components/ui/Pagination'
import TimeAgo from '@/components/ui/TimeAgo'
import type { SessionListItem } from './SessionCard'
import { formatCents } from '@/lib/poker/money'
import { formatPokerDateTime } from '@/lib/poker/periods'
import { LEDGER_TONE_CLASS, ledgerState } from '@/lib/poker/phrases'
import { binkOfTheNight, sessionTitle } from '@/lib/poker/stats'
import { cn } from '@/lib/utils'

interface SessionsListClientProps {
  live: SessionListItem[]
  sessions: SessionListItem[]
  mine: boolean
  currentPage: number
  totalPages: number
  viewerId: string | null
}

const GRID = 'md:grid md:grid-cols-[104px_minmax(0,1.5fr)_64px_92px_minmax(0,1.1fr)_150px_84px] md:items-center md:gap-x-4'

function kindLabel(s: SessionListItem): string {
  return s.kind === 'tournament' ? (s.is_official ? 'Official' : 'Tournament') : 'Cash'
}

function Row({ session, viewerId }: { session: SessionListItem; viewerId: string | null }) {
  const isLive = session.status === 'live'
  const counts = session.status === 'final' || session.status === 'disputed'
  const mine = viewerId ? session.entries.find((e) => e.user_id === viewerId) : null
  const bink = counts ? binkOfTheNight(session.entries) : null
  const winner = bink ? (bink.user?.display_name ?? bink.guest?.name ?? null) : null
  const state = ledgerState(session, viewerId)
  const title = sessionTitle(session)
  const money = Number(session.total_buy_in_cents)

  const when = isLive ? (
    'Live'
  ) : session.status === 'scheduled' && session.scheduled_for ? (
    formatPokerDateTime(session.scheduled_for, false)
  ) : (
    <TimeAgo date={session.played_at} />
  )

  return (
    <Link
      href={`/poker/sessions/${session.id}`}
      className={cn(
        'block min-h-[52px] border-t py-3 transition hover:bg-white/[0.03] md:py-0',
        GRID,
        isLive ? 'border-loss/50' : 'border-line',
        state.dim && 'opacity-50'
      )}
    >
      {/* Wide: one cell per column */}
      <span className={cn('tabular hidden text-xs md:block', isLive ? 'text-loss' : 'text-mute')}>{when}</span>
      <span className="hidden min-w-0 items-baseline gap-2.5 md:flex">
        <span className="truncate text-[15px] text-white">{title}</span>
        <span className="shrink-0 text-xs text-mute">{kindLabel(session)}</span>
      </span>
      <span className="tabular hidden text-right text-sm text-zinc-400 md:block">{session.player_count}</span>
      <span className="tabular hidden text-right text-sm text-white md:block">{money > 0 ? formatCents(money, { compact: true }) : '—'}</span>
      <span className="hidden min-w-0 truncate pl-4 text-sm text-zinc-300 md:block">
        {winner && bink ? (
          <>
            {winner} <MoneyDelta cents={bink.net_cents} compact />
          </>
        ) : (
          <span className="text-zinc-600">—</span>
        )}
      </span>
      <span className={cn('hidden truncate text-[13px] md:block', LEDGER_TONE_CLASS[state.tone])}>{state.text}</span>
      <span className="hidden text-right md:block">{mine && counts ? <MoneyDelta cents={mine.net_cents} compact /> : <span className="tabular text-sm text-zinc-600">—</span>}</span>

      {/* Narrow: two lines */}
      <span className="flex items-baseline gap-3 md:hidden">
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="truncate text-[15px] text-white">{title}</span>
            <span className="shrink-0 text-xs text-mute">{kindLabel(session)}</span>
          </span>
          <span className="mt-0.5 block text-xs text-mute">
            <span className={cn('tabular', isLive && 'text-loss')}>{when}</span> · <span className="tabular">{session.player_count}</span> players
            {money > 0 && (
              <>
                {' '}
                · <span className="tabular">{formatCents(money, { compact: true })}</span> in
              </>
            )}
            {' · '}
            <span className={LEDGER_TONE_CLASS[state.tone]}>{state.text}</span>
          </span>
        </span>
        {mine && counts && <MoneyDelta cents={mine.net_cents} compact />}
      </span>
    </Link>
  )
}

export default function SessionsListClient({ live, sessions, mine, currentPage, totalPages, viewerId }: SessionsListClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const goToPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(p))
    router.push(`/poker/sessions?${params.toString()}`)
  }

  if (live.length === 0 && sessions.length === 0) {
    return (
      <div className="mt-8">
        <EmptyState
          title={mine ? 'No nights with you in them yet' : 'No sessions logged yet'}
          description="Open a table. The ledger fills in as the night goes."
          action={
            viewerId ? (
              <Button href="/play" variant="outline">
                Open a table
              </Button>
            ) : (
              <Button href="/signup" variant="outline">
                Join
              </Button>
            )
          }
        />
        <div className="mt-6">
          <Pagination page={currentPage} totalPages={totalPages} onPage={goToPage} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className={cn('hidden pb-2.5 pt-3.5 text-xs text-mute', GRID)}>
        <span>When</span>
        <span>Night</span>
        <span className="text-right">Players</span>
        <span className="text-right">Money in</span>
        <span className="pl-4">Took the night</span>
        <span>Ledger</span>
        <span className="text-right">You</span>
      </div>
      <div className="border-b border-line-strong md:border-b-0">
        {live.map((s) => (
          <Row key={s.id} session={s} viewerId={viewerId} />
        ))}
        {sessions.map((s) => (
          <Row key={s.id} session={s} viewerId={viewerId} />
        ))}
      </div>
      {sessions.length === 0 && <p className="border-t border-line py-4 text-sm text-mute">{mine ? 'No finished nights with you in them yet.' : 'No finished nights yet.'}</p>}
      <div className="mt-4 border-t border-line-strong pt-4 md:mt-0">
        <Pagination page={currentPage} totalPages={totalPages} onPage={goToPage} />
      </div>
    </div>
  )
}
