'use client'

import { cn } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Icon from '@/components/ui/Icon'
import Icon from '@/components/ui/Icon'
import DollarInput, { focusNextMoneyInput } from '@/components/ui/DollarInput'
import MoneyDelta from '@/components/ui/MoneyDelta'
import Stepper from '@/components/ui/Stepper'
import PlayerName from './PlayerName'
import { formatCents, ordinal } from '@/lib/poker/money'
import type { PlayerRefWithHouse, PokerSessionKind } from '@/lib/poker/types'

export interface RowState {
  key: string
  user: PlayerRefWithHouse
  buyInCents: number
  cashOutCents: number | null
  rebuys: number
  place: number | null
  /** Tournament: buy-in was hand-edited, stop deriving it from the entry fee */
  buyInTouched: boolean
}

interface LedgerRowEditorProps {
  row: RowState
  kind: PokerSessionKind
  playerCount: number
  currentUserId: string
  standardBuyIn: number | null
  disabled?: boolean
  onChange: (patch: Partial<RowState>) => void
  onRemove: () => void
  onQuickBuyIn: () => void
  onBustOut: () => void
}

/** One editable ledger row; stacks on mobile, becomes a grid from `sm` */
export default function LedgerRowEditor({
  row,
  kind,
  playerCount,
  currentUserId,
  standardBuyIn,
  disabled,
  onChange,
  onRemove,
  onQuickBuyIn,
  onBustOut,
}: LedgerRowEditorProps) {
  const net = (row.cashOutCents ?? 0) - row.buyInCents
  const isTourney = kind === 'tournament'
  const canQuick = standardBuyIn != null && standardBuyIn > 0

  return (
    <div
      className={cn(
        'grid gap-3 px-4 py-3',
        isTourney
          ? 'sm:grid-cols-[minmax(0,1fr)_7rem_6.5rem_6rem_7rem_5rem_2rem] sm:items-center'
          : 'sm:grid-cols-[minmax(0,1fr)_7rem_7.5rem_7rem_5rem_2rem] sm:items-center'
      )}
    >
      {/* Player + (mobile) remove */}
      <div className="flex items-center justify-between gap-2 sm:justify-start">
        <PlayerName player={row.user} isMe={row.user.id === currentUserId} href={false} />
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label={`Remove ${row.user.display_name}`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/[0.06] hover:text-loss sm:hidden"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
      </div>

      {/* Buy-in */}
      <div className="grid grid-cols-2 gap-2 sm:contents">
        <div>
          <p className="eyebrow mb-1 sm:hidden">
            {isTourney ? 'Buy-in' : 'Buy-in (total)'}
          </p>
          <DollarInput
            valueCents={row.buyInCents}
            onChange={(c) => onChange({ buyInCents: c ?? 0, buyInTouched: true })}
            size="sm"
            disabled={disabled}
            aria-label={`${row.user.display_name} buy-in`}
            onEnter={() => focusNextMoneyInput(document.activeElement as HTMLElement)}
          />
        </div>

        {/* Rebuys / quick buy-in */}
        <div className="flex flex-col gap-1">
          <p className="eyebrow sm:hidden">
            {isTourney ? 'Rebuys / add-ons' : 'Rebuys'}
          </p>
          <div className="flex items-center gap-1.5">
            <Stepper
              value={row.rebuys}
              onChange={(n) => onChange({ rebuys: n })}
              max={100}
              size="sm"
              label={`${row.user.display_name} rebuys`}
              disabled={disabled}
            />
            {!isTourney && canQuick && (
              <button
                type="button"
                disabled={disabled}
                onClick={onQuickBuyIn}
                title={`Add a ${formatCents(standardBuyIn!, { compact: true })} buy-in`}
                className="tabular inline-flex h-8 items-center rounded-lg border border-orange-500/40 bg-orange-500/10 px-2 text-xs font-semibold text-orange-400 transition hover:bg-orange-500/15 disabled:opacity-50"
              >
                +{formatCents(standardBuyIn!, { compact: true })}
              </button>
            )}
          </div>
        </div>

        {/* Place (tournament) */}
        {isTourney && (
          <div>
            <p className="eyebrow mb-1 sm:hidden">Place</p>
            <div className="flex items-center gap-1.5">
              <select
                className="input min-h-[38px] px-2 py-1 text-sm"
                value={row.place ?? ''}
                disabled={disabled}
                aria-label={`${row.user.display_name} finishing place`}
                onChange={(e) => onChange({ place: e.target.value === '' ? null : Number(e.target.value) })}
              >
                <option value="">—</option>
                {Array.from({ length: playerCount }, (_, i) => i + 1).map((p) => (
                  <option key={p} value={p}>
                    {ordinal(p)}
                  </option>
                ))}
              </select>
              {row.place == null && (
                <Button size="sm" variant="secondary" onClick={onBustOut} disabled={disabled} type="button">
                  Out
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Cash-out / payout */}
        <div>
          <p className="eyebrow mb-1 sm:hidden">
            {isTourney ? 'Payout' : 'Cash-out'}
          </p>
          <DollarInput
            valueCents={row.cashOutCents}
            onChange={(c) => onChange({ cashOutCents: c })}
            size="sm"
            placeholder={isTourney ? '0' : '—'}
            disabled={disabled}
            aria-label={`${row.user.display_name} ${isTourney ? 'payout' : 'cash-out'}`}
            onEnter={() => focusNextMoneyInput(document.activeElement as HTMLElement)}
          />
        </div>
      </div>

      {/* Net */}
      <div className="flex items-center justify-between sm:justify-end">
        <span className="eyebrow sm:hidden">Net</span>
        {row.cashOutCents == null && !isTourney ? (
          <span className="text-xs text-zinc-500">still playing</span>
        ) : (
          <MoneyDelta cents={net} chip compact />
        )}
      </div>

      {/* Desktop remove */}
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Remove ${row.user.display_name}`}
        className="hidden h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/[0.06] hover:text-loss sm:inline-flex"
      >
        <Icon name="close" className="h-4 w-4" />
      </button>
    </div>
  )
}
