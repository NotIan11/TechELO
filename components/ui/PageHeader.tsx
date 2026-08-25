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
        size === 'lg' ? 'mb-8 sm:flex-row sm:items-end sm:justify-between' : 'sm:flex-row sm:items-start sm:justify-between',
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
              'font-display font-bold tracking-tight text-white',
              size === 'lg' ? 'text-3xl' : 'truncate text-xl sm:text-2xl'
            )}
          >
            {title}
          </h1>
          {subtitle && <p className={cn('text-zinc-400', size === 'lg' ? 'mt-1.5' : 'mt-1 text-sm')}>{subtitle}</p>}
          {meta && <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">{meta}</div>}
        </div>
      </div>
      {actions && <div className={cn('flex flex-wrap items-center gap-2 sm:shrink-0', size === 'lg' && 'gap-3')}>{actions}</div>}
    </div>
  )
}
