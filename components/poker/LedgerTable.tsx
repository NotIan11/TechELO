import Card from '@/components/ui/Card'
import MoneyDelta, { Money } from '@/components/ui/MoneyDelta'
import PlayerName from './PlayerName'
import { cn } from '@/lib/utils'
import { formatCents, ordinal } from '@/lib/poker/money'
import type { SessionEntryWithUser } from '@/lib/poker/queries'
import type { PokerSessionKind } from '@/lib/poker/types'

interface LedgerTableProps {
  kind: PokerSessionKind
  entries: SessionEntryWithUser[]
  currentUserId: string | null
  binkId?: string | null
  totals: { buyIn: number; cashOut: number; discrepancy: number }
  prizePoolCents: number | null
  showAcks: boolean
}

function AckIcon({ entry }: { entry: SessionEntryWithUser }) {
  if (entry.disputed_at) {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20 text-xs font-bold text-red-300" title={`Disputed: ${entry.dispute_reason ?? ''}`}>
        !
      </span>
    )
  }
  if (entry.acknowledged_at) {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300" title="Confirmed">
        <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      </span>
    )
  }
  return <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/15 text-slate-600" title="Not confirmed yet" />
}

/** Sorted ledger for a finalized session */
export default function LedgerTable({ kind, entries, currentUserId, binkId, totals, prizePoolCents, showAcks }: LedgerTableProps) {
  const isTourney = kind === 'tournament'
  const rows = [...entries].sort((a, b) =>
    isTourney
      ? (a.finish_place ?? 999) - (b.finish_place ?? 999) || b.net_cents - a.net_cents
      : b.net_cents - a.net_cents
  )
  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.net_cents)))

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/[0.06]">
          <thead>
            <tr className="text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              <th className="w-10 px-4 py-2.5">#</th>
              <th className="px-2 py-2.5">Player</th>
              <th className="hidden px-3 py-2.5 text-right sm:table-cell">Buy-in</th>
              <th className="hidden px-3 py-2.5 text-right sm:table-cell">{isTourney ? 'Payout' : 'Cash-out'}</th>
              <th className="px-3 py-2.5 text-right">Net</th>
              {showAcks && <th className="hidden w-12 px-3 py-2.5 text-center sm:table-cell">✓</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {rows.map((e, i) => {
              const isMe = e.user_id === currentUserId
              const isBink = e.id === binkId
              const place = isTourney ? e.finish_place : i + 1
              return (
                <tr
                  key={e.id}
                  className={cn(
                    isMe ? 'bg-orange-400/[0.06]' : isBink ? 'bg-emerald-400/[0.04]' : undefined
                  )}
                >
                  <td className={cn('tabular px-4 py-3 text-sm', place === 1 && isTourney ? 'font-bold text-amber-300' : 'text-slate-500')}>
                    {place == null ? '—' : isTourney ? ordinal(place) : place}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2">
                      <PlayerName player={e.user} isMe={isMe} />
                      {showAcks && <span className="sm:hidden"><AckIcon entry={e} /></span>}
                    </div>
                    <p className="tabular mt-1 text-xs text-slate-500 sm:hidden">
                      In {formatCents(e.buy_in_cents, { compact: true })} · Out {formatCents(e.cash_out_cents ?? 0, { compact: true })}
                    </p>
                  </td>
                  <td className="tabular hidden px-3 py-3 text-right text-sm text-slate-300 sm:table-cell">
                    <Money cents={e.buy_in_cents} compact />
                    {e.rebuy_count > 0 && (
                      <span className="block text-[11px] text-slate-500">×{e.rebuy_count} reload{e.rebuy_count === 1 ? '' : 's'}</span>
                    )}
                  </td>
                  <td className="tabular hidden px-3 py-3 text-right text-sm text-slate-300 sm:table-cell">
                    <Money cents={e.cash_out_cents ?? 0} compact />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <span className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.06] md:block" aria-hidden="true">
                        <span
                          className={cn('block h-full rounded-full', e.net_cents >= 0 ? 'bg-emerald-400/70' : 'bg-red-400/70')}
                          style={{ width: `${Math.round((Math.abs(e.net_cents) / maxAbs) * 100)}%` }}
                        />
                      </span>
                      <MoneyDelta cents={e.net_cents} chip compact />
                    </div>
                  </td>
                  {showAcks && (
                    <td className="hidden px-3 py-3 text-center sm:table-cell">
                      <AckIcon entry={e} />
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-white/[0.08] text-sm">
              <td className="px-4 py-2.5" />
              <td className="px-2 py-2.5 text-xs uppercase tracking-wider text-slate-500">
                Totals
                <span className="tabular mt-0.5 block normal-case tracking-normal text-slate-400 sm:hidden">
                  In {formatCents(totals.buyIn, { compact: true })} · Out {formatCents(totals.cashOut, { compact: true })}
                </span>
              </td>
              <td className="tabular hidden px-3 py-2.5 text-right text-slate-300 sm:table-cell">
                <Money cents={prizePoolCents ?? totals.buyIn} compact />
                {prizePoolCents != null && <span className="block text-[11px] text-slate-500">prize pool</span>}
              </td>
              <td className="tabular hidden px-3 py-2.5 text-right text-slate-300 sm:table-cell">
                <Money cents={totals.cashOut} compact />
              </td>
              <td className="px-3 py-2.5 text-right">
                <MoneyDelta cents={totals.discrepancy} compact size="xs" className={totals.discrepancy === 0 ? 'text-slate-500' : undefined} />
              </td>
              {showAcks && <td className="hidden sm:table-cell" />}
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  )
}
