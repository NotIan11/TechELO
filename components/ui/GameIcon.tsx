import { cn } from '@/lib/utils'

interface GameIconProps {
  game: 'pool' | 'ping_pong' | 'poker' | string
  className?: string
}

/** Inline icons for the game types: an 8-ball, a paddle + ball, and a poker chip. */
export default function GameIcon({ game, className }: GameIconProps) {
  if (game === 'poker') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={cn('h-5 w-5', className)} aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15" />
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
        {/* six edge notches: circumference of r=8.6 ≈ 54 → dash 4, gap 5 */}
        <circle
          cx="12"
          cy="12"
          r="8.6"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeDasharray="4 5"
          strokeDashoffset="2"
          opacity="0.7"
        />
        <circle cx="12" cy="12" r="5.5" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="1.7" fill="currentColor" />
      </svg>
    )
  }
  if (game === 'pool') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={cn('h-5 w-5', className)} aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15" />
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="9.5" r="4" fill="currentColor" opacity="0.25" />
        <text
          x="12"
          y="12.5"
          textAnchor="middle"
          fontSize="7.5"
          fontWeight="700"
          fill="currentColor"
        >
          8
        </text>
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn('h-5 w-5', className)} aria-hidden="true">
      <ellipse
        cx="10.5"
        cy="9.5"
        rx="6.5"
        ry="7.5"
        transform="rotate(-20 10.5 9.5)"
        fill="currentColor"
        opacity="0.15"
      />
      <ellipse
        cx="10.5"
        cy="9.5"
        rx="6.5"
        ry="7.5"
        transform="rotate(-20 10.5 9.5)"
        stroke="currentColor"
        strokeWidth="1.5"
      />
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

/** Tailwind text color class for a game's accent */
export function gameColor(game: string): string {
  if (game === 'ping_pong') return 'text-pong'
  if (game === 'poker') return 'text-poker'
  return 'text-pool'
}
