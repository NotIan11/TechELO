'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Badge from '@/components/ui/Badge'
import MoneyDelta from '@/components/ui/MoneyDelta'
import TextLink from '@/components/ui/TextLink'
import TimeAgo from '@/components/ui/TimeAgo'
import PlayerName from './PlayerName'
import { formatCents, ordinal } from '@/lib/poker/money'
import { plural } from '@/lib/poker/phrases'
import { sessionTitle } from '@/lib/poker/stats'
import type { SessionFull } from '@/lib/poker/queries'
import { cn } from '@/lib/utils'

/** Read-only view of a live session for everyone but the host; refreshes on realtime changes */
export default function LiveSessionView({ session, currentUserId }: { session: SessionFull; currentUserId: string | null }) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`poker-session:${session.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poker_sessions', filter: `id=eq.${session.id}` }, () => router.refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poker_entries', filter: `session_id=eq.${session.id}` }, () => router.refresh())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [session.id, router])

  const isTourney = session.kind === 'tournament'
  const settled = (e: SessionFull['entries'][number]) => (isTourney ? e.finish_place != null : e.cash_out_cents != null)
  const rows = [...session.entries].sort((a, b) => {
    if (isTourney) return (a.finish_place ?? 999) - (b.finish_place ?? 999) || b.net_cents - a.net_cents
    return Number(settled(a)) - Number(settled(b)) || b.buy_in_cents - a.buy_in_cents
  })
  const moneyIn = Number(session.total_buy_in_cents)
  const moneyOut = Number(session.total_cash_out_cents)
  const playing = session.entries.filter((e) => !settled(e)).length

  return (
    <div className="mx-auto max-w-2xl">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-mute">
        <TextLink href="/poker" muted>
          Poker
        </TextLink>
        <span>·</span>
        <Badge tone="live">Live</Badge>
        {session.host && <span>· hosted by {session.host.display_name}</span>}
      </p>
      <h1 className="mt-2.5 font-display text-2xl tracking-tight text-white sm:text-[32px]">{sessionTitle(session)}</h1>
      <p className="mt-1 text-[13px] text-mute">
        {[isTourney ? 'Tournament' : 'Cash game', session.location].filter(Boolean).join(' · ')}
        {session.started_at && (
          <>
            {' '}
            · started <TimeAgo date={session.started_at} />
          </>
        )}
      </p>

      <p className="mt-6 text-[13px] text-mute">{isTourney ? 'In the prize pool' : 'On the table'}</p>
      <p className="tabular mt-0.5 text-[56px] leading-none tracking-tighter text-white">{formatCents(isTourney ? (session.prize_pool_cents ?? moneyIn) : moneyIn - moneyOut)}</p>
      <p className="tabular mt-2.5 text-[13px] text-zinc-400">
        in {formatCents(moneyIn)} · {isTourney ? 'paid out' : 'out'} {formatCents(moneyOut)} · {playing} {isTourney ? 'still in' : 'playing'}
      </p>

      <div className="mt-6 border-t border-line-bright">
        {rows.length === 0 ? (
          <p className="border-b border-line py-5 text-sm text-mute">The host has not added players yet.</p>
        ) : (
          rows.map((e) => {
            const done = settled(e)
            return (
              <div key={e.id} className={cn('flex min-h-[62px] items-center gap-3 border-b border-line py-2', done && 'opacity-60')}>
                <span className="min-w-0 flex-1">
                  <PlayerName player={e.user} isMe={e.user_id != null && e.user_id === currentUserId} className="[&>span:first-child]:text-base" />
                  <span className="tabular block text-xs text-mute">
                    in {formatCents(e.buy_in_cents, { compact: true })}
                    {e.rebuy_count > 0 && ` · ${e.rebuy_count} ${plural(e.rebuy_count, 'reload')}`}
                    {!isTourney && e.cash_out_cents != null && ` · out ${formatCents(e.cash_out_cents, { compact: true })}`}
                    {isTourney && e.finish_place != null && ` · ${ordinal(e.finish_place)}`}
                  </span>
                </span>
                {done ? (
                  <MoneyDelta cents={e.net_cents} size="md" compact />
                ) : (
                  <span className="tabular text-base text-zinc-400">{formatCents(e.buy_in_cents, { compact: true })}</span>
                )}
              </div>
            )
          })
        )}
      </div>
      <p className="mt-4 text-xs text-mute">Updates as the host edits the ledger.</p>
    </div>
  )
}
