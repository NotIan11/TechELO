'use client'

import Button from './Button'
import { cn } from '@/lib/utils'

interface ConfirmStripProps {
  text: React.ReactNode
  onConfirm: () => void
  onBack: () => void
  busy?: boolean
  tone?: 'neutral' | 'danger' | 'primary'
  confirmLabel?: string
  busyLabel?: string
  disabled?: boolean
  errors?: string[]
  warnings?: string[]
  /** Text and buttons on one row */
  inline?: boolean
  children?: React.ReactNode
  className?: string
}

const CONFIRM_VARIANT = { neutral: 'secondary', danger: 'danger', primary: 'primary' } as const

/** Inline confirmation replacing modals: question, optional input, Confirm / Back */
export default function ConfirmStrip({
  text,
  onConfirm,
  onBack,
  busy,
  tone = 'primary',
  confirmLabel = 'Confirm',
  busyLabel = 'Working…',
  disabled,
  errors = [],
  warnings = [],
  inline,
  children,
  className,
}: ConfirmStripProps) {
  const buttons = (
    <div className={cn('flex flex-wrap gap-2', !inline && 'mt-3')}>
      <Button size="sm" variant={CONFIRM_VARIANT[tone]} onClick={onConfirm} disabled={busy || disabled} type="button">
        {busy ? busyLabel : confirmLabel}
      </Button>
      <Button size="sm" variant="ghost" onClick={onBack} disabled={busy} type="button">
        Back
      </Button>
    </div>
  )
  return (
    <div
      className={cn(
        'mt-3 rounded-lg border bg-ink-900 p-3',
        tone === 'danger' ? 'border-loss/20' : 'border-line',
        inline && !children && errors.length === 0 && warnings.length === 0 && 'flex flex-wrap items-center gap-3',
        className
      )}
    >
      <div className="text-sm text-zinc-200">{text}</div>
      {children && <div className="mt-3">{children}</div>}
      {errors.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-loss">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      {errors.length === 0 && warnings.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-warn">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
      {buttons}
    </div>
  )
}
