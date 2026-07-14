import Badge, { type BadgeTone } from './Badge'

const statusConfig: Record<string, { label: string; tone: BadgeTone }> = {
  pending_start: { label: 'Challenge sent', tone: 'yellow' },
  in_progress: { label: 'In progress', tone: 'blue' },
  pending_result: { label: 'Awaiting result', tone: 'purple' },
  completed: { label: 'Completed', tone: 'green' },
  disputed: { label: 'Disputed', tone: 'red' },
  cancelled: { label: 'Cancelled', tone: 'gray' },
  challenge_expired: { label: 'Expired', tone: 'gray' },
}

export default function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { label: status.replace(/_/g, ' '), tone: 'gray' as BadgeTone }
  return (
    <Badge tone={config.tone} dot>
      {config.label}
    </Badge>
  )
}
