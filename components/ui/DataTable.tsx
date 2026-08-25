import Card from './Card'
import { cn } from '@/lib/utils'

type Hide = 'sm' | 'md' | 'lg'
const HIDE: Record<Hide, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
}
const ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' }

/** Card-wrapped, horizontally scrollable table */
export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Card padding="none" className={cn('overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-line">{children}</table>
      </div>
    </Card>
  )
}

export function Th({
  align = 'left',
  hide,
  className,
  children,
}: {
  align?: keyof typeof ALIGN
  hide?: Hide
  className?: string
  children?: React.ReactNode
}) {
  return <th className={cn('eyebrow px-4 py-3 sm:px-5', ALIGN[align], hide && HIDE[hide], className)}>{children}</th>
}

export function Tr({
  me,
  tint,
  hover = true,
  className,
  children,
}: {
  me?: boolean
  tint?: 'win'
  hover?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <tr
      className={cn(
        'transition',
        hover && 'hover:bg-ink-700/60',
        me ? 'bg-orange-500/10' : tint === 'win' ? 'bg-win/5' : undefined,
        className
      )}
    >
      {children}
    </tr>
  )
}

export function Td({
  align = 'left',
  hide,
  numeric,
  className,
  children,
}: {
  align?: keyof typeof ALIGN
  hide?: Hide
  numeric?: boolean
  className?: string
  children?: React.ReactNode
}) {
  return (
    <td
      className={cn(
        'whitespace-nowrap px-4 py-3.5 text-sm sm:px-5',
        numeric ? 'tabular text-right text-zinc-300' : ALIGN[align],
        hide && HIDE[hide],
        className
      )}
    >
      {children}
    </td>
  )
}

/** Small proportional bar used next to ratings and net amounts */
export function MiniBar({
  value,
  max,
  tone = 'orange',
  className,
}: {
  value: number
  max: number
  tone?: 'orange' | 'sign'
  className?: string
}) {
  const pct = Math.max(6, Math.round((Math.abs(value) / Math.max(1, max)) * 100))
  return (
    <span className={cn('h-1.5 w-16 overflow-hidden rounded-full bg-ink-600', className)} aria-hidden="true">
      <span
        className={cn(
          'block h-full rounded-full',
          tone === 'orange' ? 'bg-orange-500/70' : value >= 0 ? 'bg-win/70' : 'bg-loss/70'
        )}
        style={{ width: `${pct}%` }}
      />
    </span>
  )
}
