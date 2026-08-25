import Badge, { type BadgeTone } from './Badge'

const statusConfig: Record<string, { label: string; tone: BadgeTone }> = {
  pending_start: { label: 'Challenge sent', tone: 'warn' },
  in_progress: { label: 'In progress', tone: 'orange' },
  pending_result: { label: 'Awaiting result', tone: 'orange' },
  completed: { label: 'Completed', tone: 'win' },
  disputed: { label: 'Disputed', tone: 'loss' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  challenge_expired: { label: 'Expired', tone: 'neutral' },
}

export default function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { label: status.replace(/_/g, ' '), tone: 'neutral' as BadgeTone }
  return (
    <Badge tone={config.tone} dot>
      {config.label}
    </Badge>
  )
}
