import { Table, Td, Th, Tr } from '@/components/ui/DataTable'
import DivergingBar from '@/components/ui/DivergingBar'
import MoneyDelta, { Money } from '@/components/ui/MoneyDelta'
import PlayerName from './PlayerName'
import { cn } from '@/lib/utils'
import { formatCents, ordinal } from '@/lib/poker/money'
import { plural } from '@/lib/poker/phrases'
import type { SessionEntryWithUser } from '@/lib/poker/queries'
import type { PokerSessionKind } from '@/lib/poker/types'

interface LedgerTableProps {
  kind: PokerSessionKind
  entries: SessionEntryWithUser[]
  currentUserId: string | null
  hostId?: string | null
  totals: { buyIn: number; cashOut: number; discrepancy: number }
  prizePoolCents: number | null
  /** Show each line's confirmation state (logged sessions only) */
  showAcks: boolean
}

/** A line's confirmation state in words, from the viewer's point of view */
function lineState(entry: SessionEntryWithUser, isMe: boolean): { text: string; cls: string; title?: string } {
  if (entry.user_id == null) return { text: 'No account yet', cls: 'text-mute', title: 'Guest: no account to confirm with yet' }
  if (entry.disputed_at) return { text: 'Disputed', cls: 'text-loss', title: entry.dispute_reason ?? undefined }
  if (entry.acknowledged_at) return { text: 'Confirmed', cls: 'text-mute' }
  if (isMe) return { text: 'Waiting on you', cls: 'text-warn' }
  return { text: 'Not confirmed yet', cls: 'text-warn' }
}

/** Sorted ledger for a finished session: one ruled row per player and a totals row */
export default function LedgerTable({ kind, entries, currentUserId, hostId, totals, prizePoolCents, showAcks }: LedgerTableProps) {
  const isTourney = kind === 'tournament'
  const rows = [...entries].sort((a, b) =>
    isTourney ? (a.finish_place ?? 999) - (b.finish_place ?? 999) || b.net_cents - a.net_cents : b.net_cents - a.net_cents
  )
  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.net_cents)))
  const balanced = totals.discrepancy === 0
  const balanceWord = balanced ? (
    <span className="text-win">Balanced</span>
  ) : (
    <span className="text-warn">
      Off by <span className="tabular">{formatCents(Math.abs(totals.discrepancy), { compact: true })}</span>
    </span>
  )

  return (
    <Table className="[&_thead_tr]:border-b [&_thead_tr]:border-line-bright [&_tbody_tr:first-child]:border-t-0">
      <thead>
        <tr>
          {isTourney && <Th className="w-14">Place</Th>}
          <Th>Player</Th>
          <Th align="center" hide="md" className="w-60">
            Down · Up
          </Th>
          <Th align="right" hide="sm">
            In
          </Th>
          <Th align="right" hide="sm">
            {isTourney ? 'Payout' : 'Out'}
          </Th>
          <Th align="right">Net</Th>
          {showAcks && (
            <Th align="right" hide="sm">
              Line
            </Th>
          )}
        </tr>
      </thead>
      <tbody>
        {rows.map((e) => {
          const isMe = e.user_id != null && e.user_id === currentUserId
          const state = lineState(e, isMe)
          return (
            <Tr key={e.id} me={isMe} hover={false}>
              {isTourney && (
                <Td className={cn('tabular', e.finish_place === 1 ? 'text-orange-400' : 'text-zinc-400')}>{e.finish_place == null ? '—' : ordinal(e.finish_place)}</Td>
              )}
              <Td className="h-14 whitespace-normal py-2">
                <span className="flex flex-wrap items-baseline gap-x-2.5">
                  <PlayerName player={e.user} isMe={isMe} tag={e.user_id != null && e.user_id === hostId ? 'host' : null} />
                  {e.rebuy_count > 0 && (
                    <span className="text-xs text-mute">
                      <span className="tabular">{e.rebuy_count}</span> {plural(e.rebuy_count, 'reload')}
                    </span>
                  )}
                </span>
                <span className="tabular mt-0.5 block text-xs text-mute sm:hidden">
                  in {formatCents(e.buy_in_cents, { compact: true })} · out {formatCents(e.cash_out_cents ?? 0, { compact: true })}
                  {showAcks && <span className={cn('font-sans', state.cls)}> · {state.text}</span>}
                </span>
              </Td>
              <Td hide="md" className="w-60">
                <DivergingBar value={e.net_cents} max={maxAbs} className="px-3" />
              </Td>
              <Td numeric hide="sm" className="text-zinc-400">
                <Money cents={e.buy_in_cents} />
              </Td>
              <Td numeric hide="sm" className="text-zinc-400">
                <Money cents={e.cash_out_cents ?? 0} />
              </Td>
              <Td align="right">
                <MoneyDelta cents={e.net_cents} size="md" className="text-[15px]" />
              </Td>
              {showAcks && (
                <Td align="right" hide="sm" className={cn('text-[13px]', state.cls)}>
                  <span title={state.title}>{state.text}</span>
                </Td>
              )}
            </Tr>
          )
        })}
      </tbody>
      <tfoot>
        <tr className="text-sm text-white">
          {isTourney && <td />}
          <td className="h-14 py-2 pr-3">
            The table
            <span className="mt-0.5 block text-xs sm:hidden">
              <span className="tabular text-mute">
                in {formatCents(prizePoolCents ?? totals.buyIn, { compact: true })} · out {formatCents(totals.cashOut, { compact: true })}
              </span>{' '}
              · {balanceWord}
            </span>
          </td>
          <td className="hidden md:table-cell" />
          <td className="tabular hidden px-3 text-right sm:table-cell">
            <Money cents={prizePoolCents ?? totals.buyIn} />
            {prizePoolCents != null && <span className="block font-sans text-xs text-mute">prize pool</span>}
          </td>
          <td className="tabular hidden px-3 text-right sm:table-cell">
            <Money cents={totals.cashOut} />
          </td>
          <td className={cn('tabular px-3 text-right', !showAcks && 'pr-0')}>{formatCents(totals.discrepancy, { sign: true })}</td>
          {showAcks ? <td className="hidden pl-3 text-right text-[13px] sm:table-cell">{balanceWord}</td> : null}
        </tr>
        {!showAcks && (
          <tr className="!border-t-0 text-[13px]">
            <td colSpan={isTourney ? 6 : 5} className="pb-3 text-right">
              {balanceWord}
            </td>
          </tr>
        )}
      </tfoot>
    </Table>
  )
}
