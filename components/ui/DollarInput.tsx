'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { centsToInputText, parseDollarsToCents } from '@/lib/poker/money'

interface DollarInputProps {
  valueCents: number | null
  onChange: (cents: number | null) => void
  id?: string
  placeholder?: string
  invalid?: boolean
  disabled?: boolean
  autoFocus?: boolean
  size?: 'sm' | 'md'
  className?: string
  'aria-label'?: string
  /** Called on Enter — used to hop to the next money field */
  onEnter?: () => void
  /** Marks the element for focus-chaining (querySelectorAll('[data-money-input]')) */
  chain?: boolean
}

/**
 * Text input for dollar amounts stored as cents. Accepts "20", "20.5", "$20.50",
 * "1,250"; canonicalizes on blur; selects all on focus; numeric keyboard on mobile.
 */
export default function DollarInput({
  valueCents,
  onChange,
  id,
  placeholder = '0',
  invalid,
  disabled,
  autoFocus,
  size = 'md',
  className,
  onEnter,
  chain = true,
  ...rest
}: DollarInputProps) {
  const [text, setText] = useState(() => centsToInputText(valueCents))
  const [bad, setBad] = useState(false)
  const focused = useRef(false)

  // Sync from the outside (e.g. "+ buy-in" button) when not actively typing.
  useEffect(() => {
    if (focused.current) return
    const parsed = parseDollarsToCents(text)
    if (parsed !== valueCents) {
      setText(centsToInputText(valueCents))
      setBad(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueCents])

  return (
    <div className={cn('relative', className)}>
      <span
        className={cn(
          'pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500',
          size === 'sm' ? 'text-sm' : 'text-base'
        )}
        aria-hidden="true"
      >
        $
      </span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        enterKeyHint={onEnter ? 'next' : 'done'}
        autoComplete="off"
        autoFocus={autoFocus}
        disabled={disabled}
        placeholder={placeholder}
        value={text}
        data-money-input={chain ? '' : undefined}
        aria-label={rest['aria-label']}
        aria-invalid={invalid || bad || undefined}
        className={cn(
          'input pl-7 text-right',
          size === 'sm' && 'min-h-[38px] px-2.5 py-1.5 text-sm',
          (invalid || bad) && 'border-red-400/60 focus:border-red-400/60 focus:ring-red-400/20'
        )}
        onFocus={(e) => {
          focused.current = true
          e.currentTarget.select()
        }}
        onChange={(e) => {
          const next = e.target.value
          setText(next)
          if (next.trim() === '') {
            setBad(false)
            onChange(null)
            return
          }
          const parsed = parseDollarsToCents(next)
          setBad(parsed == null)
          if (parsed != null) onChange(parsed)
        }}
        onBlur={() => {
          focused.current = false
          const parsed = parseDollarsToCents(text)
          if (parsed == null) {
            setText(centsToInputText(valueCents))
            setBad(false)
          } else {
            setText(centsToInputText(parsed))
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onEnter) {
            e.preventDefault()
            onEnter()
          }
        }}
      />
    </div>
  )
}

/** Move focus to the next `[data-money-input]` in DOM order (wraps to nothing at the end) */
export function focusNextMoneyInput(current: HTMLElement | null): void {
  if (typeof document === 'undefined') return
  const all = Array.from(document.querySelectorAll<HTMLInputElement>('[data-money-input]'))
  const idx = current ? all.indexOf(current as HTMLInputElement) : -1
  const next = all[idx + 1]
  if (next) next.focus()
  else current?.blur()
}
