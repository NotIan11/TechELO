'use client'

import Icon from './Icon'
import { cn } from '@/lib/utils'

interface StepperProps {
  value: number
  onChange: (next: number) => void
  min?: number
  max?: number
  label: string
  size?: 'sm' | 'md'
  disabled?: boolean
  className?: string
}

/** − n + control with accessible labelling */
export default function Stepper({ value, onChange, min = 0, max = 999, label, size = 'md', disabled, className }: StepperProps) {
  const btn = cn(
    'inline-flex items-center justify-center rounded-lg border border-line bg-ink-700 text-zinc-200 transition hover:bg-ink-600 disabled:pointer-events-none disabled:opacity-40',
    size === 'sm' ? 'h-8 w-8' : 'h-10 w-10'
  )
  return (
    <div className={cn('inline-flex items-center gap-1', className)} role="group" aria-label={label}>
      <button type="button" className={btn} aria-label={`Decrease ${label}`} disabled={disabled || value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
        <Icon name="minus" className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      <span className={cn('tabular min-w-[1.75rem] text-center font-semibold text-white', size === 'sm' ? 'text-sm' : 'text-base')} aria-live="polite">
        {value}
      </span>
      <button type="button" className={btn} aria-label={`Increase ${label}`} disabled={disabled || value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
        <Icon name="plus" className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>
  )
}
