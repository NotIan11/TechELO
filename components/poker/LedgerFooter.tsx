'use client'

import Banner from '@/components/ui/Banner'
import Button from '@/components/ui/Button'
import ConfirmStrip from '@/components/ui/ConfirmStrip'
import Icon from '@/components/ui/Icon'
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
    <div className="sticky bottom-0 z-20 -mx-4 border-t border-line bg-ink-950/90 px-4 py-3 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border">
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
        <p className="tabular flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-300">
          <span>
            <span className="text-zinc-500">{playerCount}</span> player{playerCount === 1 ? '' : 's'}
          </span>
          <span>
            <span className="text-zinc-500">{inLabel}</span> {formatCents(inValue, { compact: true })}
          </span>
          <span>
            <span className="text-zinc-500">{outLabel}</span> {formatCents(totals.cashOut, { compact: true })}
          </span>
          {balanced ? (
            <span className="inline-flex items-center gap-1 text-win">
              <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.5} />
              Balanced
            </span>
          ) : totals.missingCashOuts > 0 && !isTourney ? (
            <span className="text-zinc-500">{totals.missingCashOuts} still playing</span>
          ) : (
            <span className="text-warn">Off by {formatCents(Math.abs(totals.discrepancy), { compact: true })}</span>
          )}
        </p>

        {!confirming && (
          <Button size="md" onClick={onPrimary} disabled={busy} type="button" className="w-full sm:w-auto">
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
        <ConfirmStrip
          text={confirmText}
          onConfirm={onConfirm}
          onBack={onBack}
          busy={busy}
          busyLabel="Saving…"
          disabled={hardErrors.length > 0}
          errors={hardErrors}
          warnings={softWarnings}
          className="max-h-[60vh] overflow-y-auto"
        >
          {confirmExtra}
        </ConfirmStrip>
      )}
    </div>
  )
}
