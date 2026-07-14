'use client'

import { formatRelativeTime, formatDateTime } from '@/lib/utils'

/**
 * Relative timestamp. Client component with suppressHydrationWarning because
 * the value drifts between server render and hydration.
 */
export default function TimeAgo({ date, className }: { date: string; className?: string }) {
  return (
    <time dateTime={date} title={formatDateTime(date)} className={className} suppressHydrationWarning>
      {formatRelativeTime(date)}
    </time>
  )
}
