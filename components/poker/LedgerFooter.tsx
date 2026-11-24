'use client'

import Button from '@/components/ui/Button'
import ConfirmStrip from '@/components/ui/ConfirmStrip'

interface LedgerFooterProps {
  hardErrors: string[]
  softWarnings: string[]
  primaryLabel: string
  /** Label on the confirm button inside the strip */
  confirmLabel: string
  busy: boolean
  confirming: boolean
  confirmText: React.ReactNode
  onAddPlayer: () => void
  onPrimary: () => void
  onConfirm: () => void
  onBack: () => void
  /** Extra content shown inside the confirm strip (e.g. duration chips) */
  confirmExtra?: React.ReactNode
}

/**
 * The live table's action bar: "Add player" and the one primary action. Fixed to
 * the bottom of the viewport on small screens, in flow on wide ones. The confirm
 * step (with its errors and warnings) opens in place of the buttons.
 */
export default function LedgerFooter({
  hardErrors,
  softWarnings,
  primaryLabel,
  confirmLabel,
  busy,
  confirming,
  confirmText,
  onAddPlayer,
  onPrimary,
  onConfirm,
  onBack,
  confirmExtra,
}: LedgerFooterProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line-strong bg-ink-950 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 lg:static lg:z-auto lg:mt-8 lg:border-line-strong lg:px-0 lg:pb-0 lg:pt-5">
      {confirming ? (
        <ConfirmStrip
          text={confirmText}
          onConfirm={onConfirm}
          onBack={onBack}
          busy={busy}
          busyLabel="Saving…"
          confirmLabel={confirmLabel}
          disabled={hardErrors.length > 0}
          errors={hardErrors}
          warnings={softWarnings}
          className="mt-0 max-h-[70dvh] overflow-y-auto border-0 p-0 [&_button]:min-h-[48px]"
        >
          {confirmExtra}
        </ConfirmStrip>
      ) : (
        <div className="flex gap-2.5 lg:justify-end">
          <Button variant="outline" onClick={onAddPlayer} disabled={busy} type="button" className="min-h-[52px] flex-1 text-[15px] lg:flex-none lg:px-6">
            Add player
          </Button>
          <Button onClick={onPrimary} disabled={busy} type="button" className="min-h-[52px] flex-1 text-[15px] lg:flex-none lg:px-6">
            {busy ? 'Working…' : primaryLabel}
          </Button>
        </div>
      )}
    </div>
  )
}
