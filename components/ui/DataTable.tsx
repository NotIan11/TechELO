import { cn } from '@/lib/utils'

type Hide = 'sm' | 'md' | 'lg'
const HIDE: Record<Hide, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
}
const ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' }

/** Ruled, horizontally scrollable table (no card around it) */
export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="min-w-full border-collapse [&_tbody_tr]:border-t [&_tbody_tr]:border-line [&_tfoot_tr]:border-t [&_tfoot_tr]:border-line-bright">{children}</table>
    </div>
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
  return <th className={cn('eyebrow px-3 pb-2.5 pt-3 first:pl-0 last:pr-0', ALIGN[align], hide && HIDE[hide], className)}>{children}</th>
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
        hover && 'hover:bg-white/[0.03]',
        me ? 'bg-white/[0.05]' : tint === 'win' ? undefined : undefined,
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
        'h-[52px] whitespace-nowrap px-3 text-sm first:pl-0 last:pr-0',
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
    <span className={cn('h-0.5 w-16 overflow-hidden bg-white/10', className)} aria-hidden="true">
      <span
        className={cn(
          'block h-full',
          tone === 'orange' ? 'bg-white' : value >= 0 ? 'bg-win' : 'bg-loss'
        )}
        style={{ width: `${pct}%` }}
      />
    </span>
  )
}
