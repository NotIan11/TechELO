'use client'

import { cn } from '@/lib/utils'
import Banner from '@/components/ui/Banner'
import Button from '@/components/ui/Button'
import { formatCents } from '@/lib/poker/money'
import type { SessionTotals } from '@/lib/poker/stats'
import type { PokerSessionKind } from '@/lib/poker/types'

interface LedgerFooterProps {
  kind: PokerSessionKind
  totals: SessionTotals
  playerCount: number
  prizePoolCents: number | null
  hardErrors: string[]
  softWarnings: string[]
  primaryLabel: string
  busy: boolean
  confirming: boolean
  confirmText: React.ReactNode
  onPrimary: () => void
  onConfirm: () => void
  onBack: () => void
  /** Extra content shown inside the confirm strip (e.g. duration input) */
  confirmExtra?: React.ReactNode
}

/** Sticky totals + balance state + primary action for the ledger editor */
export default function LedgerFooter({
  kind,
  totals,
  playerCount,
  prizePoolCents,
  hardErrors,
  softWarnings,
  primaryLabel,
  busy,
  confirming,
  confirmText,
  onPrimary,
  onConfirm,
  onBack,
  confirmExtra,
}: LedgerFooterProps) {
  const isTourney = kind === 'tournament'
  const balanced = totals.discrepancy === 0 && totals.missingCashOuts === 0
  const inLabel = isTourney ? (prizePoolCents != null ? 'Prize pool' : 'Entries') : 'In'
  const outLabel = isTourney ? 'Paid out' : 'Out'
  const inValue = isTourney && prizePoolCents != null ? prizePoolCents : totals.buyIn

  return (
    <div className="sticky bottom-0 z-20 -mx-4 border-t border-white/[0.06] bg-base/90 px-4 py-3 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border">
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
        <p className="tabular flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-300">
          <span>
            <span className="text-slate-500">{playerCount}</span> player{playerCount === 1 ? '' : 's'}
          </span>
          <span>
            <span className="text-slate-500">{inLabel}</span> {formatCents(inValue, { compact: true })}
          </span>
          <span>
            <span className="text-slate-500">{outLabel}</span> {formatCents(totals.cashOut, { compact: true })}
          </span>
          {balanced ? (
            <span className="inline-flex items-center gap-1 text-emerald-300">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              Balanced
            </span>
          ) : totals.missingCashOuts > 0 && !isTourney ? (
            <span className="text-slate-500">
              {totals.missingCashOuts} still playing
            </span>
          ) : (
            <span className={cn(totals.discrepancy > 0 ? 'text-amber-300' : 'text-amber-300')}>
              Off by {formatCents(Math.abs(totals.discrepancy), { compact: true })}
            </span>
          )}
        </p>

        {!confirming && (
          <Button size="md" onClick={onPrimary} disabled={busy} type="button">
            {busy ? 'Working…' : primaryLabel}
          </Button>
        )}
      </div>

      {softWarnings.length > 0 && !confirming && (
        <div className="mt-2 space-y-1.5">
          {softWarnings.map((w) => (
            <Banner key={w} tone="warning" compact>
              {w}
            </Banner>
          ))}
        </div>
      )}

      {confirming && (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="text-sm text-slate-200">{confirmText}</div>
          {confirmExtra && <div className="mt-3">{confirmExtra}</div>}
          {hardErrors.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm text-red-300">
              {hardErrors.map((e) => (
                <li key={e}>• {e}</li>
              ))}
            </ul>
          ) : (
            softWarnings.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm text-amber-200">
                {softWarnings.map((w) => (
                  <li key={w}>• {w}</li>
                ))}
              </ul>
            )
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="success" onClick={onConfirm} disabled={busy || hardErrors.length > 0} type="button">
              {busy ? 'Saving…' : 'Confirm'}
            </Button>
            <Button size="sm" variant="ghost" onClick={onBack} disabled={busy} type="button">
              Back
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
