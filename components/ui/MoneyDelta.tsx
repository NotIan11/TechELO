import { cn } from '@/lib/utils'
import { formatCents } from '@/lib/poker/money'

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const sizes: Record<Size, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-2xl tracking-tighter',
  xl: 'text-5xl tracking-tighter',
}

export function moneyTone(cents: number): 'positive' | 'negative' | 'zero' {
  return cents > 0 ? 'positive' : cents < 0 ? 'negative' : 'zero'
}

const textTones = { positive: 'text-win', negative: 'text-loss', zero: 'text-zinc-500' }
// `chip` is kept for call sites but no longer draws a filled chip: money is plain coloured mono
const chipTones = textTones

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
        'tabular inline-flex items-center font-normal',
        sizes[size],
        chip ? chipTones[tone] : textTones[tone],
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
