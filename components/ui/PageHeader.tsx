import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: React.ReactNode
  eyebrow?: React.ReactNode
  subtitle?: React.ReactNode
  /** Detail meta line (size="md"): small grey facts, wraps */
  meta?: React.ReactNode
  /** Left slot: IconTile, Avatar, house swatch */
  leading?: React.ReactNode
  actions?: React.ReactNode
  /** lg = page title; md = detail header (match, session, profile, house) */
  size?: 'lg' | 'md'
  align?: 'left' | 'center'
  className?: string
}

export default function PageHeader({ title, eyebrow, subtitle, meta, leading, actions, size = 'lg', align = 'left', className }: PageHeaderProps) {
  const centered = align === 'center'
  return (
    <div
      className={cn(
        'flex flex-col gap-4',
        size === 'lg' ? 'mb-9 sm:flex-row sm:items-end sm:justify-between' : 'sm:flex-row sm:items-start sm:justify-between',
        centered && 'items-center text-center',
        className
      )}
    >
      <div className={cn('flex min-w-0 items-start gap-3', centered && 'justify-center')}>
        {leading}
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
          <h1
            className={cn(
              'font-display font-normal text-white',
              size === 'lg' ? 'text-4xl tracking-[-0.03em] sm:text-[44px] sm:leading-[1.1]' : 'truncate text-2xl tracking-tight sm:text-3xl'
            )}
          >
            {title}
          </h1>
          {subtitle && <p className={cn('text-zinc-400', size === 'lg' ? 'mt-2.5 text-[15px]' : 'mt-1.5 text-sm')}>{subtitle}</p>}
          {meta && <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-mute">{meta}</div>}
        </div>
      </div>
      {actions && <div className={cn('flex flex-wrap items-center gap-2 sm:shrink-0', size === 'lg' && 'gap-3')}>{actions}</div>}
    </div>
  )
}
