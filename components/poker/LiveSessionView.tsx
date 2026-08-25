'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import GameIcon from '@/components/ui/GameIcon'
import MoneyDelta from '@/components/ui/MoneyDelta'
import PokerStatusBadge from '@/components/ui/PokerStatusBadge'
import TimeAgo from '@/components/ui/TimeAgo'
import PlayerName from './PlayerName'
import { formatCents } from '@/lib/poker/money'
import { sessionTitle } from '@/lib/poker/stats'
import type { SessionFull } from '@/lib/poker/queries'

/** Read-only view of a live session for everyone but the host; refreshes on realtime changes */
export default function LiveSessionView({ session, currentUserId }: { session: SessionFull; currentUserId: string | null }) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`poker-session:${session.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'poker_sessions', filter: `id=eq.${session.id}` },
        () => router.refresh()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'poker_entries', filter: `session_id=eq.${session.id}` },
        () => router.refresh()
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [session.id, router])

  const isTourney = session.kind === 'tournament'
  const rows = [...session.entries].sort((a, b) => {
    if (isTourney) return (a.finish_place ?? 999) - (b.finish_place ?? 999) || b.net_cents - a.net_cents
    return b.net_cents - a.net_cents
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-poker">
            <GameIcon game="poker" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate font-display text-xl font-bold text-white">{sessionTitle(session)}</h1>
            <p className="text-xs text-zinc-500">
              {isTourney ? 'Tournament' : 'Cash game'}
              {session.location && <> · {session.location}</>}
              {session.started_at && (
                <>
                  {' · '}started <TimeAgo date={session.started_at} />
                </>
              )}
              {session.host && <> · hosted by {session.host.display_name}</>}
            </p>
          </div>
        </div>
        <PokerStatusBadge status="live" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card padding="sm">
          <p className="eyebrow">Players</p>
          <p className="tabular mt-1 font-display text-2xl font-bold text-white">{session.player_count}</p>
        </Card>
        <Card padding="sm">
          <p className="eyebrow">{isTourney ? 'Entries' : 'On the table'}</p>
          <p className="tabular mt-1 font-display text-2xl font-bold text-white">
            {formatCents(session.total_buy_in_cents, { compact: true })}
          </p>
        </Card>
        <Card padding="sm">
          <p className="eyebrow">{isTourney ? 'Paid out' : 'Cashed out'}</p>
          <p className="tabular mt-1 font-display text-2xl font-bold text-white">
            {formatCents(session.total_cash_out_cents, { compact: true })}
          </p>
        </Card>
      </div>

      <Card padding="none" className="overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-zinc-500">The host hasn’t added players yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <PlayerName player={e.user} isMe={e.user_id === currentUserId} />
                <div className="tabular flex items-center gap-4 text-sm text-zinc-400">
                  <span className="hidden sm:inline">
                    in {formatCents(e.buy_in_cents, { compact: true })}
                    {e.rebuy_count > 0 && <span className="text-zinc-600"> · {e.rebuy_count} reload{e.rebuy_count === 1 ? '' : 's'}</span>}
                  </span>
                  {isTourney && e.finish_place != null && <span className="text-zinc-300">#{e.finish_place}</span>}
                  {!isTourney && e.cash_out_cents == null ? (
                    <span className="text-xs text-zinc-500">playing</span>
                  ) : (
                    <MoneyDelta cents={e.net_cents} chip compact />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="text-center text-xs text-zinc-500">Updates live as the host edits the ledger.</p>
    </div>
  )
}
