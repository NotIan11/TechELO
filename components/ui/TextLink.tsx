import Link from 'next/link'
import Icon from './Icon'
import { cn } from '@/lib/utils'

interface TextLinkProps {
  href?: string
  onClick?: () => void
  arrow?: 'right' | 'left' | 'up-right'
  /** Quiet grey link (e.g. "details") */
  muted?: boolean
  className?: string
  children: React.ReactNode
}

/** Inline text link in the accent color, optionally with a small arrow */
export default function TextLink({ href, onClick, arrow, muted, className, children }: TextLinkProps) {
  const classes = cn(
    'inline-flex items-center gap-1',
    muted ? 'text-zinc-500 underline-offset-2 transition hover:text-zinc-300 hover:underline' : 'link',
    className
  )
  const arrowIcon = arrow && (
    <Icon name={arrow === 'right' ? 'arrow-right' : arrow === 'left' ? 'arrow-left' : 'arrow-up-right'} className="h-3.5 w-3.5" />
  )
  const inner = (
    <>
      {arrow === 'left' && arrowIcon}
      {children}
      {arrow !== 'left' && arrowIcon}
    </>
  )
  if (href) {
    return (
      <Link href={href} className={classes}>
        {inner}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className={classes}>
      {inner}
    </button>
  )
}
