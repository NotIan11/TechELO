import { cn } from '@/lib/utils'

interface HeroProps {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  lede?: React.ReactNode
  actions?: React.ReactNode
  /** Top-right slot (status badge, share) — panel variant */
  aside?: React.ReactNode
  align?: 'left' | 'center'
  /** Boxed panel with an orange rule across the top (event page only) */
  panel?: boolean
  children?: React.ReactNode
  className?: string
}

/** Page-opening headline block. One button in `actions` is the rule. */
export default function Hero({ eyebrow, title, lede, actions, aside, align = 'left', panel, children, className }: HeroProps) {
  const centered = align === 'center'
  return (
    <section
      className={cn(
        panel
          ? 'relative overflow-hidden rounded-3xl border border-line bg-ink-950 p-6 sm:p-8'
          : cn('pb-10 pt-6 sm:pt-10', centered && 'text-center'),
        className
      )}
    >
      {panel && <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-orange-500" />}
      {(eyebrow || aside) && (
        <div className={cn('mb-4 flex flex-wrap items-center gap-3', centered ? 'justify-center' : 'justify-between')}>
          <div className={cn(!eyebrow && 'flex-1')}>{typeof eyebrow === 'string' ? <p className="eyebrow">{eyebrow}</p> : eyebrow}</div>
          {aside && <div className="flex items-center gap-2">{aside}</div>}
        </div>
      )}
      <h1
        className={cn(
          'font-display font-bold tracking-tight text-white',
          panel ? 'text-3xl sm:text-4xl' : 'max-w-3xl text-4xl sm:text-6xl',
          centered && 'mx-auto'
        )}
      >
        {title}
      </h1>
      {lede && <p className={cn('mt-4 max-w-xl text-balance text-zinc-400', panel ? 'text-base text-zinc-300' : 'text-lg', centered && 'mx-auto')}>{lede}</p>}
      {actions && <div className={cn('mt-6 flex flex-wrap items-center gap-3', centered && 'justify-center')}>{actions}</div>}
      {children}
    </section>
  )
}
