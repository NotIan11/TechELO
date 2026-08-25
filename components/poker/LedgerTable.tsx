import { MiniBar, Table, Td, Th, Tr } from '@/components/ui/DataTable'
import Icon from '@/components/ui/Icon'
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
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-loss/20 text-loss" title={`Disputed: ${entry.dispute_reason ?? ''}`}>
        <Icon name="alert" className="h-3 w-3" strokeWidth={2.5} />
      </span>
    )
  }
  if (entry.acknowledged_at) {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-win/20 text-win" title="Confirmed">
        <Icon name="check" className="h-3 w-3" strokeWidth={2.5} />
      </span>
    )
  }
  return <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-line-strong" title="Not confirmed yet" />
}

/** Sorted ledger for a finalized session */
export default function LedgerTable({ kind, entries, currentUserId, binkId, totals, prizePoolCents, showAcks }: LedgerTableProps) {
  const isTourney = kind === 'tournament'
  const rows = [...entries].sort((a, b) =>
    isTourney ? (a.finish_place ?? 999) - (b.finish_place ?? 999) || b.net_cents - a.net_cents : b.net_cents - a.net_cents
  )
  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.net_cents)))

  return (
    <Table>
      <thead>
        <tr>
          <Th className="w-10">#</Th>
          <Th className="px-2">Player</Th>
          <Th align="right" hide="sm">
            Buy-in
          </Th>
          <Th align="right" hide="sm">
            {isTourney ? 'Payout' : 'Cash-out'}
          </Th>
          <Th align="right">Net</Th>
          {showAcks && (
            <Th align="center" hide="sm" className="w-12">
              <Icon name="check" className="mx-auto h-3.5 w-3.5" />
            </Th>
          )}
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {rows.map((e, i) => {
          const isMe = e.user_id === currentUserId
          const isBink = e.id === binkId
          const place = isTourney ? e.finish_place : i + 1
          return (
            <Tr key={e.id} me={isMe} tint={isBink ? 'win' : undefined} hover={false}>
              <Td className={cn('tabular px-4', place === 1 && isTourney ? 'font-bold text-orange-400' : 'text-zinc-500')}>
                {place == null ? '—' : isTourney ? ordinal(place) : place}
              </Td>
              <Td className="whitespace-normal px-2">
                <div className="flex items-center gap-2">
                  <PlayerName player={e.user} isMe={isMe} />
                  {showAcks && (
                    <span className="sm:hidden">
                      <AckIcon entry={e} />
                    </span>
                  )}
                </div>
                <p className="tabular mt-1 text-xs text-zinc-500 sm:hidden">
                  In {formatCents(e.buy_in_cents, { compact: true })} · Out {formatCents(e.cash_out_cents ?? 0, { compact: true })}
                </p>
              </Td>
              <Td numeric hide="sm">
                <Money cents={e.buy_in_cents} compact />
                {e.rebuy_count > 0 && (
                  <span className="block text-[11px] text-zinc-500">
                    ×{e.rebuy_count} reload{e.rebuy_count === 1 ? '' : 's'}
                  </span>
                )}
              </Td>
              <Td numeric hide="sm">
                <Money cents={e.cash_out_cents ?? 0} compact />
              </Td>
              <Td align="right">
                <div className="flex items-center justify-end gap-3">
                  <MiniBar value={e.net_cents} max={maxAbs} tone="sign" className="hidden w-20 md:block" />
                  <MoneyDelta cents={e.net_cents} chip compact />
                </div>
              </Td>
              {showAcks && (
                <Td align="center" hide="sm">
                  <AckIcon entry={e} />
                </Td>
              )}
            </Tr>
          )
        })}
      </tbody>
      <tfoot>
        <tr className="border-t border-line-strong text-sm">
          <td className="px-4 py-2.5" />
          <td className="px-2 py-2.5">
            <span className="eyebrow">Totals</span>
            <span className="tabular mt-0.5 block text-xs text-zinc-400 sm:hidden">
              In {formatCents(totals.buyIn, { compact: true })} · Out {formatCents(totals.cashOut, { compact: true })}
            </span>
          </td>
          <td className="tabular hidden px-4 py-2.5 text-right text-zinc-300 sm:table-cell sm:px-5">
            <Money cents={prizePoolCents ?? totals.buyIn} compact />
            {prizePoolCents != null && <span className="block text-[11px] text-zinc-500">prize pool</span>}
          </td>
          <td className="tabular hidden px-4 py-2.5 text-right text-zinc-300 sm:table-cell sm:px-5">
            <Money cents={totals.cashOut} compact />
          </td>
          <td className="px-4 py-2.5 text-right sm:px-5">
            <MoneyDelta cents={totals.discrepancy} compact size="xs" className={totals.discrepancy === 0 ? 'text-zinc-500' : undefined} />
          </td>
          {showAcks && <td className="hidden sm:table-cell" />}
        </tr>
      </tfoot>
    </Table>
  )
}
