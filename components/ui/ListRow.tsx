import Link from 'next/link'
import Icon from './Icon'
import { cn } from '@/lib/utils'

interface ListRowProps {
  href?: string
  leading?: React.ReactNode
  title: React.ReactNode
  badges?: React.ReactNode
  meta?: React.ReactNode
  trailing?: React.ReactNode
  /** Defaults to true when href is set */
  chevron?: boolean
  /** Flat left accent bar (hex), e.g. a house color */
  accent?: string
  tone?: 'default' | 'live'
  size?: 'md' | 'sm'
  dim?: boolean
  className?: string
}

/** The one list-row card used for matches, sessions, houses, members, awards */
export default function ListRow({
  href,
  leading,
  title,
  badges,
  meta,
  trailing,
  chevron,
  accent,
  tone = 'default',
  size = 'md',
  dim,
  className,
}: ListRowProps) {
  const showChevron = chevron ?? !!href
  const classes = cn(
    'card group relative flex items-center overflow-hidden transition',
    size === 'md' ? 'gap-4 p-4 sm:p-5' : 'gap-3 p-3',
    href && 'hover:-translate-y-px hover:border-line-strong',
    tone === 'live' && 'border-loss/40',
    dim && 'opacity-70',
    className
  )
  const body = (
    <>
      {accent && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: accent }} />}
      {leading}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-white group-hover:text-orange-400">{title}</p>
          {badges}
        </div>
        {meta && <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-500">{meta}</div>}
      </div>
      {(trailing || showChevron) && (
        <div className="flex shrink-0 items-center gap-3">
          {trailing}
          {showChevron && (
            <Icon
              name="chevron-right"
              className="h-4 w-4 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-zinc-400"
            />
          )}
        </div>
      )}
    </>
  )
  if (href) {
    return (
      <Link href={href} className={classes}>
        {body}
      </Link>
    )
  }
  return <div className={classes}>{body}</div>
}
