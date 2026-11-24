'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import DollarInput from '@/components/ui/DollarInput'
import MoneyDelta from '@/components/ui/MoneyDelta'
import Stepper from '@/components/ui/Stepper'
import Sheet from './Sheet'
import { formatCents, ordinal } from '@/lib/poker/money'
import { firstName, plural } from '@/lib/poker/phrases'
import type { PlayerRefWithHouse, PokerSessionKind } from '@/lib/poker/types'
import { cn } from '@/lib/utils'

export interface RowState {
  key: string
  /** The account, or a guest placeholder (`guest: true`) when there is none */
  user: PlayerRefWithHouse
  /** poker_guests id when this row was seated as a guest (kept after linking so edits stay attached) */
  guestId: string | null
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
  /** Cash: what is left on the table (after this row's cash-out) and how many others are still playing */
  tableLeftCents: number
  othersPlaying: number
  onChange: (patch: Partial<RowState>) => void
  onRemove: () => void
  /** Add `cents` to the buy-in as one reload */
  onReload: (cents: number) => void
  onBustOut: () => void
  onClose: () => void
}

const LABEL = 'mb-2 block text-[13px] text-mute'
const QUIET_BUTTON =
  'inline-flex min-h-[44px] items-center rounded border border-line-strong px-3.5 text-sm text-zinc-300 transition hover:border-line-bright hover:text-white disabled:pointer-events-none disabled:opacity-50'
const BIG_MONEY = '[&_input]:tabular [&_input]:min-h-[56px] [&_input]:text-2xl'

/**
 * One player's editor: a bottom sheet on a phone, an inline panel on wide screens.
 * Reloads, the cash-out (or tournament place and payout), and removal.
 */
export default function LedgerRowEditor({
  row,
  kind,
  playerCount,
  currentUserId,
  standardBuyIn,
  disabled,
  tableLeftCents,
  othersPlaying,
  onChange,
  onRemove,
  onReload,
  onBustOut,
  onClose,
}: LedgerRowEditorProps) {
  const [otherOpen, setOtherOpen] = useState(false)
  const [otherCents, setOtherCents] = useState<number | null>(null)

  const net = (row.cashOutCents ?? 0) - row.buyInCents
  const isTourney = kind === 'tournament'
  const std = standardBuyIn != null && standardBuyIn > 0 ? standardBuyIn : null
  const name = row.user.display_name
  const first = firstName(name)
  const showOther = otherOpen || std == null

  const addOther = () => {
    if (otherCents == null || otherCents <= 0) return
    onReload(otherCents)
    setOtherCents(null)
    setOtherOpen(false)
  }

  return (
    <Sheet
      label={name}
      onClose={onClose}
      header={
        <>
          <h2 className="font-display text-2xl tracking-tight text-white">
            {name}
            {row.user.id === currentUserId && <span className="ml-2 font-sans text-xs tracking-normal text-orange-400">you</span>}
            {row.user.guest && <span className="ml-2 font-sans text-xs tracking-normal text-mute">guest</span>}
          </h2>
          <p className="tabular mt-1 text-[13px] text-zinc-400">
            in for {formatCents(row.buyInCents, { compact: true })}
            {row.rebuys > 0 && ` · ${row.rebuys} ${plural(row.rebuys, isTourney ? 'rebuy' : 'reload')}`}
          </p>
        </>
      }
    >
      <div className="lg:max-w-xl">
        {/* Cash: one-tap reloads */}
        {!isTourney && (
          <div className="mt-6">
            <p className={LABEL}>Reload</p>
            {std != null && (
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onReload(std)}
                  className="tabular min-h-[56px] rounded border border-line-bright text-lg text-white transition hover:border-white/60 disabled:opacity-50"
                >
                  +{formatCents(std, { compact: true })}
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onReload(std * 2)}
                  className="tabular min-h-[56px] rounded border border-line-strong text-lg text-zinc-300 transition hover:border-line-bright disabled:opacity-50"
                >
                  +{formatCents(std * 2, { compact: true })}
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  aria-expanded={otherOpen}
                  onClick={() => setOtherOpen((o) => !o)}
                  className={cn(
                    'min-h-[56px] rounded border text-[15px] transition disabled:opacity-50',
                    otherOpen ? 'border-white text-white' : 'border-line-strong text-zinc-300 hover:border-line-bright'
                  )}
                >
                  Other
                </button>
              </div>
            )}
            {showOther && (
              <div className={cn('flex items-center gap-2', std != null && 'mt-2')}>
                <DollarInput
                  valueCents={otherCents}
                  onChange={setOtherCents}
                  disabled={disabled}
                  autoFocus={otherOpen}
                  chain={false}
                  onEnter={addOther}
                  className="flex-1 [&_input]:tabular"
                  aria-label={`Add to ${name}’s buy-in`}
                />
                <button type="button" className={QUIET_BUTTON} disabled={disabled || otherCents == null || otherCents <= 0} onClick={addOther}>
                  Add reload
                </button>
              </div>
            )}
            {std != null && (
              <p className="mt-2 text-xs text-mute">
                <span className="tabular">{formatCents(std, { compact: true })}</span> is this table’s standard buy-in.
              </p>
            )}
          </div>
        )}

        {/* The running totals stay directly editable */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div>
            <p className={LABEL}>{isTourney ? 'Buy-in' : 'In for, in total'}</p>
            <DollarInput
              valueCents={row.buyInCents}
              onChange={(c) => onChange({ buyInCents: c ?? 0, buyInTouched: true })}
              disabled={disabled}
              chain={false}
              className="[&_input]:tabular"
              aria-label={`${name} buy-in`}
            />
          </div>
          <div>
            <p className={LABEL}>{isTourney ? 'Rebuys and add-ons' : 'Reloads'}</p>
            <Stepper value={row.rebuys} onChange={(n) => onChange({ rebuys: n })} max={100} label={`${name} rebuys`} disabled={disabled} />
          </div>
        </div>

        {/* Tournament: place and payout */}
        {isTourney && (
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div>
              <p className={LABEL}>Finished</p>
              <div className="flex items-center gap-2">
                <select
                  className="input tabular bg-ink-950"
                  value={row.place ?? ''}
                  disabled={disabled}
                  aria-label={`${name} finishing place`}
                  onChange={(e) => onChange({ place: e.target.value === '' ? null : Number(e.target.value) })}
                >
                  <option value="">Still in</option>
                  {Array.from({ length: playerCount }, (_, i) => i + 1).map((p) => (
                    <option key={p} value={p}>
                      {ordinal(p)}
                    </option>
                  ))}
                </select>
                {row.place == null && (
                  <button type="button" className={cn(QUIET_BUTTON, 'shrink-0')} onClick={onBustOut} disabled={disabled}>
                    Out
                  </button>
                )}
              </div>
            </div>
            <div>
              <p className={cn(LABEL, 'flex justify-between gap-2')}>
                Payout <MoneyDelta cents={net} size="xs" compact />
              </p>
              <DollarInput
                valueCents={row.cashOutCents}
                onChange={(c) => onChange({ cashOutCents: c })}
                placeholder="0"
                disabled={disabled}
                chain={false}
                onEnter={onClose}
                className="[&_input]:tabular"
                aria-label={`${name} payout`}
              />
            </div>
          </div>
        )}

        {/* Cash: the cash-out, with the resulting net beside it */}
        {!isTourney && (
          <div className="mt-7">
            <p className={LABEL}>Cashing out with</p>
            <div className="flex items-center gap-4">
              <DollarInput
                valueCents={row.cashOutCents}
                onChange={(c) => onChange({ cashOutCents: c })}
                placeholder="—"
                disabled={disabled}
                chain={false}
                onEnter={onClose}
                className={cn('flex-1', BIG_MONEY)}
                aria-label={`${name} cash-out`}
              />
              <span className="min-w-[5.5rem] text-right" aria-live="polite">
                {row.cashOutCents == null ? <span className="text-[13px] text-mute">still playing</span> : <MoneyDelta cents={net} size="md" />}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className={QUIET_BUTTON} disabled={disabled} onClick={() => onChange({ cashOutCents: 0 })}>
                Busted, <span className="tabular ml-1">$0</span>
              </button>
              <button type="button" className={QUIET_BUTTON} disabled={disabled} onClick={() => onChange({ cashOutCents: row.buyInCents })}>
                Even, <span className="tabular ml-1">{formatCents(row.buyInCents, { compact: true })}</span>
              </button>
              {row.cashOutCents != null && (
                <button type="button" className={cn(QUIET_BUTTON, 'border-transparent text-mute')} disabled={disabled} onClick={() => onChange({ cashOutCents: null })}>
                  Still playing
                </button>
              )}
            </div>
            {row.cashOutCents != null && (
              <p className="mt-5 text-[13px] text-zinc-400">
                Leaves <span className="tabular text-white">{formatCents(tableLeftCents)}</span> on the table
                {othersPlaying > 0 ? ` between ${othersPlaying} ${plural(othersPlaying, 'player')}` : ' with everyone cashed out'}.
              </p>
            )}
          </div>
        )}

        <Button type="button" full onClick={onClose} className="mt-5 min-h-[52px] text-[15px] lg:w-auto lg:px-8">
          {!isTourney && row.cashOutCents != null ? `Cash ${first} out` : 'Done'}
        </Button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            onRemove()
            onClose()
          }}
          className="mt-1 min-h-[44px] w-full text-sm text-mute transition hover:text-loss disabled:opacity-50 lg:ml-4 lg:w-auto"
        >
          Remove from this table
        </button>
      </div>
    </Sheet>
  )
}
