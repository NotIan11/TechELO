'use client'

import { cn } from '@/lib/utils'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  icon?: React.ReactNode
}

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

/** Scoreboard-style tab switcher: dark track, active tab underlined in orange */
export default function Segmented<T extends string>({ options, value, onChange, className }: SegmentedProps<T>) {
  return (
    <div className={cn('inline-flex rounded-lg border border-line bg-ink-900 p-1', className)} role="tablist">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative inline-flex min-h-[36px] items-center gap-2 rounded-md px-3.5 text-sm font-medium transition',
              active
                ? 'bg-ink-600 text-white after:absolute after:inset-x-3 after:bottom-0.5 after:h-0.5 after:rounded-full after:bg-orange-500'
                : 'text-zinc-400 hover:text-white'
            )}
          >
            {option.icon}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
