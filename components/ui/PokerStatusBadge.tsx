import Badge from './Badge'
import { cn } from '@/lib/utils'
import type { PokerSessionStatus } from '@/lib/poker/types'

interface PokerStatusBadgeProps {
  status: PokerSessionStatus
  acked?: number
  total?: number
  className?: string
}

/** Upcoming / Live / Verified / n of m confirmed / Disputed / Voided */
export default function PokerStatusBadge({ status, acked = 0, total = 0, className }: PokerStatusBadgeProps) {
  if (status === 'scheduled') {
    return (
      <Badge tone="blue" dot className={className}>
        Upcoming
      </Badge>
    )
  }
  if (status === 'live') {
    return (
      <Badge tone="red" className={cn('gap-1.5', className)}>
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-loss opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-loss" />
        </span>
        Live
      </Badge>
    )
  }
  if (status === 'voided') {
    return (
      <Badge tone="gray" className={className}>
        Voided
      </Badge>
    )
  }
  if (status === 'disputed') {
    return (
      <Badge tone="red" dot className={className}>
        Disputed
      </Badge>
    )
  }
  if (total > 0 && acked >= total) {
    return (
      <Badge tone="green" dot className={className}>
        Verified
      </Badge>
    )
  }
  return (
    <Badge tone="yellow" dot className={className}>
      {total > 0 ? `${acked}/${total} confirmed` : 'Logged'}
    </Badge>
  )
}
