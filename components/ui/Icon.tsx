import { cn } from '@/lib/utils'

export type IconName =
  | 'trophy'
  | 'chevron-right'
  | 'chevron-left'
  | 'chevron-down'
  | 'arrow-right'
  | 'arrow-left'
  | 'arrow-up-right'
  | 'check'
  | 'close'
  | 'plus'
  | 'minus'
  | 'share'
  | 'inbox'
  | 'menu'
  | 'logout'
  | 'alert'
  | 'flame'
  | 'snowflake'
  | 'crown'
  | 'clock'
  | 'bolt'
  | 'users'
  | 'house'
  | 'whale'
  | 'shark'
  | 'pick'
  | 'dice'
  | 'refresh'
  | 'bubble'
  | 'gift'
  | 'chip'
  | 'cue'
  | 'paddle'

const PATHS: Record<IconName, React.ReactNode> = {
  trophy: (
    <>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4z" />
      <path d="M8 5H5v1a3 3 0 0 0 3 3M16 5h3v1a3 3 0 0 1-3 3" />
      <path d="M12 13v3M9 20h6M10 17h4v3" />
    </>
  ),
  'chevron-right': <path d="m9 6 6 6-6 6" />,
  'chevron-left': <path d="m15 6-6 6 6 6" />,
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  'arrow-right': <path d="M5 12h14M13 6l6 6-6 6" />,
  'arrow-left': <path d="M19 12H5M11 6l-6 6 6 6" />,
  'arrow-up-right': <path d="M7 17 17 7M8 7h9v9" />,
  check: <path d="m5 12 5 5L20 7" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  share: <path d="M12 3v13M8 7l4-4 4 4M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />,
  inbox: <path d="M3 13h5l2 3h4l2-3h5M5 5h14l2 8v6H3v-6l2-8z" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  logout: <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M14 8l4 4-4 4M18 12H9" />,
  alert: <path d="M12 9v4M12 17h.01M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z" />,
  flame: <path d="M12 3c1 3 4 5 4 9a4 4 0 0 1-8 0c0-1.5.5-2.5 1-3.5.5 1 1.5 1.5 2 1.5 0-3-1-5 1-7z" />,
  snowflake: <path d="M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9M10 4l2 2 2-2M10 20l2-2 2 2" />,
  crown: <path d="M4 18h16M4 18 3 8l5 4 4-6 4 6 5-4-1 10z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  bolt: <path d="M13 3 5 14h6l-1 7 8-11h-6l1-7z" />,
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20a6 6 0 0 1 12 0M15 5a3.5 3.5 0 0 1 0 7M17 14a6 6 0 0 1 4 6" />
    </>
  ),
  house: <path d="M4 11 12 4l8 7M6 10v10h12V10M10 20v-6h4v6" />,
  whale: <path d="M3 13c3-5 9-6 14-3 1 .5 2 1.5 4 1.5-1 3-4 5-8 5H8c-3 0-5-1.5-5-3.5zM13 10.5c-1-2-3-3-5-3 0 2 1 3.5 3 4M6.5 14.5h.01" />,
  shark: <path d="M3 15c4-1 7-1 11-1l4 1-2-4c2 0 4 1 5 3-1 2-3 3-6 3H7c-2 0-3-1-4-2zM11 10l1-5 3 5M5 15l-2 3" />,
  pick: <path d="M4 20l9-9M13 11l1-1a7 7 0 0 1 6 2M13 11l-1-1a7 7 0 0 0-2-6M11 13l1 1" />,
  dice: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8.5 8.5h.01M15.5 15.5h.01M12 12h.01M15.5 8.5h.01M8.5 15.5h.01" strokeWidth="2.5" />
    </>
  ),
  refresh: <path d="M20 11a8 8 0 0 0-14-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4l2-2M20 20v-5h-5" />,
  bubble: (
    <>
      <circle cx="10" cy="11" r="6" />
      <circle cx="17" cy="6" r="2" />
      <path d="M8 9a3 3 0 0 1 2-2" />
    </>
  ),
  gift: <path d="M4 12h16v8H4zM3 8h18v4H3zM12 8v12M12 8c-2 0-4-1-4-3s3-1 4 3c1-4 4-5 4-3s-2 3-4 3z" />,
  chip: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
    </>
  ),
  cue: <path d="M4 20 19 5M17 7l2 2M6 18l-2 2M15 6.5l2.5 2.5" />,
  paddle: <path d="M10.5 4a5.5 5.5 0 1 1-3.3 9.9M7.2 13.9 3.5 17.6l2.9 2.9 3.7-3.7M18 6.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 1 1 0-3" />,
}

interface IconProps {
  name: IconName
  className?: string
  strokeWidth?: number
  'aria-label'?: string
}

/** Single-file line icon set. Inherits currentColor; sized with height/width classes (default h-5 w-5). */
export default function Icon({ name, className, strokeWidth = 1.5, ...rest }: IconProps) {
  const label = rest['aria-label']
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-5 w-5 shrink-0', className)}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
    >
      {PATHS[name]}
    </svg>
  )
}
