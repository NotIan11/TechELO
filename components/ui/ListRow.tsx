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
  /** Small colour square before the row (hex), e.g. a house color */
  accent?: string
  tone?: 'default' | 'live'
  size?: 'md' | 'sm'
  dim?: boolean
  className?: string
}

/** The one list row used for matches, sessions, houses, members, awards: a ruled line, not a card */
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
    'group relative flex items-center border-b border-line transition',
    size === 'md' ? 'gap-4 py-4' : 'gap-3 py-3',
    href && 'hover:border-line-bright',
    tone === 'live' && 'border-loss/50',
    dim && 'opacity-70',
    className
  )
  const body = (
    <>
      {accent && <span aria-hidden="true" className="h-3 w-3 shrink-0 ring-1 ring-white/30" style={{ backgroundColor: accent }} />}
      {leading}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-[15px] text-white">{title}</p>
          {badges}
        </div>
        {meta && <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-mute">{meta}</div>}
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
