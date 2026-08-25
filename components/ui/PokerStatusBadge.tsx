import Badge from './Badge'
import type { PokerSessionStatus } from '@/lib/poker/types'

interface PokerStatusBadgeProps {
  status: PokerSessionStatus
  acked?: number
  total?: number
  className?: string
}

/** Upcoming / Live / Verified / n of m confirmed / Disputed / Voided */
export default function PokerStatusBadge({ status, acked = 0, total = 0, className }: PokerStatusBadgeProps) {
  if (status === 'scheduled') return <Badge tone="orange" dot className={className}>Upcoming</Badge>
  if (status === 'live') return <Badge tone="live" className={className}>Live</Badge>
  if (status === 'voided') return <Badge tone="neutral" className={className}>Voided</Badge>
  if (status === 'disputed') return <Badge tone="loss" dot className={className}>Disputed</Badge>
  if (total > 0 && acked >= total) return <Badge tone="win" dot className={className}>Verified</Badge>
  return (
    <Badge tone="warn" dot className={className}>
      {total > 0 ? `${acked}/${total} confirmed` : 'Logged'}
    </Badge>
  )
}
