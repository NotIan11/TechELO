import { cn } from '@/lib/utils'

const sizes = { xs: 'h-3.5 w-3.5', sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-6 w-6', xl: 'h-8 w-8' }

interface GameIconProps {
  game: 'pool' | 'ping_pong' | 'poker' | string
  size?: keyof typeof sizes
  className?: string
}

/** Monochrome glyphs for the three games: 8-ball, paddle + ball, poker chip. Color comes from the parent. */
export default function GameIcon({ game, size = 'md', className }: GameIconProps) {
  const cls = cn(sizes[size], 'shrink-0', className)
  if (game === 'poker') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={cls} aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="8.6" stroke="currentColor" strokeWidth="2.2" strokeDasharray="4 5" strokeDashoffset="2" opacity="0.6" />
        <circle cx="12" cy="12" r="5.5" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="1.7" fill="currentColor" />
      </svg>
    )
  }
  if (game === 'pool') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={cls} aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="10.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
        <text x="12" y="12.9" textAnchor="middle" fontSize="6.5" fontWeight="700" fill="currentColor">
          8
        </text>
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cls} aria-hidden="true">
      <ellipse cx="10.5" cy="9.5" rx="6.5" ry="7.5" transform="rotate(-20 10.5 9.5)" stroke="currentColor" strokeWidth="1.5" />
      <path d="M13.5 16.5L16 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="19.5" cy="8.5" r="2.2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function gameLabel(game: string): string {
  if (game === 'ping_pong') return 'Ping Pong'
  if (game === 'pool') return 'Pool'
  if (game === 'poker') return 'Poker'
  return game
}
