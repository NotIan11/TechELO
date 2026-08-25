'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

export interface ChipOption<T extends string> {
  value: T
  label: string
}

interface ChipSelectProps<T extends string> {
  options: readonly ChipOption<T>[]
  value: string | null
  onChange: (value: string | null) => void
  /** Adds a "Custom" chip that reveals a free-text input */
  allowCustom?: boolean
  customPlaceholder?: string
  /** Tapping the active chip clears the selection */
  clearable?: boolean
  size?: 'sm' | 'md'
  className?: string
  'aria-label'?: string
}

/** Row of pill toggles for presets (stakes, variant, duration) with optional custom text */
export default function ChipSelect<T extends string>({
  options,
  value,
  onChange,
  allowCustom,
  customPlaceholder = 'Custom',
  clearable = true,
  size = 'md',
  className,
  ...rest
}: ChipSelectProps<T>) {
  const isPreset = value != null && options.some((o) => o.value === value)
  const [customOpen, setCustomOpen] = useState(value != null && !isPreset)
  const showCustom = allowCustom && (customOpen || (value != null && !isPreset))

  const chip = (active: boolean) =>
    cn(
      'inline-flex items-center rounded-full border font-medium transition',
      size === 'sm' ? 'min-h-[32px] px-3 text-xs' : 'min-h-[36px] px-3.5 text-sm',
      active
        ? 'border-orange-400/50 bg-orange-400/10 text-orange-200'
        : 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white'
    )

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)} role="group" aria-label={rest['aria-label']}>
      {options.map((o) => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            className={chip(active)}
            onClick={() => {
              setCustomOpen(false)
              onChange(active && clearable ? null : o.value)
            }}
          >
            {o.label}
          </button>
        )
      })}
      {allowCustom && (
        <button
          type="button"
          aria-pressed={!!showCustom}
          className={chip(!!showCustom)}
          onClick={() => {
            if (showCustom) {
              setCustomOpen(false)
              onChange(null)
            } else {
              setCustomOpen(true)
              onChange(isPreset ? null : value)
            }
          }}
        >
          Custom
        </button>
      )}
      {showCustom && (
        <input
          type="text"
          className={cn('input w-40', size === 'sm' && 'min-h-[32px] px-3 py-1 text-sm')}
          placeholder={customPlaceholder}
          value={value ?? ''}
          autoFocus
          onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
        />
      )}
    </div>
  )
}
