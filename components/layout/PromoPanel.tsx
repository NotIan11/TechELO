import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface PromoPanelProps {
  eyebrow: React.ReactNode
  /** Headline line — numbers inside should be tabular */
  line: React.ReactNode
  /** Optional second, quieter line */
  sub?: React.ReactNode
  /** Shows a pulsing "Live" badge next to the eyebrow */
  live?: boolean
  cta?: { href: string; label: string; variant?: 'outline' | 'primary' | 'secondary' }
  /** Body slot (home lanes) */
  children?: React.ReactNode
  /** Footer slot rendered under the body (home lanes) */
  footer?: React.ReactNode
  className?: string
}

/** The one cross-promotion surface: eyebrow, a line, one button, orange left rule */
export default function PromoPanel({ eyebrow, line, sub, live, cta, children, footer, className }: PromoPanelProps) {
  return (
    <section className={cn('card flex flex-col border-l-2 border-l-orange-500 px-5 py-4', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="eyebrow">{eyebrow}</p>
            {live && <Badge tone="live">Live</Badge>}
          </div>
          <p className="tabular mt-1 text-[15px] text-white">{line}</p>
          {sub && <p className="mt-0.5 text-[13px] text-zinc-500">{sub}</p>}
        </div>
        {cta && (
          <Button href={cta.href} variant={cta.variant ?? 'outline'} size="sm" className="w-full sm:w-auto">
            {cta.label}
          </Button>
        )}
      </div>
      {children && <div className="mt-4 flex-1">{children}</div>}
      {footer && <div className="mt-4 flex flex-wrap items-center gap-3">{footer}</div>}
    </section>
  )
}
