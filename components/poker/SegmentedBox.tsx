'use client'

import { cn } from '@/lib/utils'

interface SegmentedBoxProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  'aria-label': string
  className?: string
}

/** Boxed two-or-three-part switch: one hairline outline, the chosen part filled white */
export default function SegmentedBox<T extends string>({ options, value, onChange, className, ...rest }: SegmentedBoxProps<T>) {
  return (
    <div role="group" aria-label={rest['aria-label']} className={cn('inline-flex rounded border border-line-strong', className)}>
      {options.map((o, i) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'min-h-[44px] px-4 text-sm transition',
              i > 0 && 'border-l border-line-strong',
              active ? 'bg-white font-medium text-ink-950' : 'text-zinc-400 hover:text-white'
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
