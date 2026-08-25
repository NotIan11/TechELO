import { cn } from '@/lib/utils'
import { formatCents } from '@/lib/poker/money'

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const sizes: Record<Size, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'font-display text-2xl tracking-tight',
  xl: 'font-display text-4xl tracking-tight',
}

export function moneyTone(cents: number): 'positive' | 'negative' | 'zero' {
  return cents > 0 ? 'positive' : cents < 0 ? 'negative' : 'zero'
}

const textTones = { positive: 'text-win', negative: 'text-loss', zero: 'text-zinc-500' }
const chipTones = { positive: 'bg-win/10 text-win', negative: 'bg-loss/10 text-loss', zero: 'bg-ink-600 text-zinc-400' }

interface MoneyDeltaProps {
  cents: number
  size?: Size
  /** Tinted background chip */
  chip?: boolean
  /** Drop ".00" on whole-dollar amounts */
  compact?: boolean
  className?: string
}

/** Signed, colored money amount: +$45.00 / −$20.00 / $0 */
export default function MoneyDelta({ cents, size = 'sm', chip, compact, className }: MoneyDeltaProps) {
  const tone = moneyTone(cents)
  return (
    <span
      className={cn(
        'tabular inline-flex items-center font-semibold',
        sizes[size],
        chip ? cn('rounded-md px-1.5 py-0.5', chipTones[tone]) : textTones[tone],
        className
      )}
    >
      {formatCents(cents, { sign: true, compact })}
    </span>
  )
}

/** Unsigned money amount in the default text color */
export function Money({ cents, compact, className }: { cents: number; compact?: boolean; className?: string }) {
  return <span className={cn('tabular', className)}>{formatCents(cents, { compact })}</span>
}
