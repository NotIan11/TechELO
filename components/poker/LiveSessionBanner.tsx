import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import { sessionTitle } from '@/lib/poker/stats'
import type { PokerSessionRow } from '@/lib/poker/types'
import { cn } from '@/lib/utils'

/** "You have a live table" line shown on poker pages while the host has an open session */
export default function LiveSessionBanner({ session, className }: { session: PokerSessionRow | null; className?: string }) {
  if (!session) return null
  return (
    <Link
      href={`/poker/sessions/${session.id}`}
      className={cn(
        'flex min-h-[52px] items-center justify-between gap-3 rounded border border-loss/50 px-4 py-3 text-sm text-zinc-200 transition hover:border-loss',
        className ?? 'mt-8'
      )}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <Badge tone="live">Live</Badge>
        <span className="truncate">
          Your {session.kind === 'tournament' ? 'tournament' : 'cash game'} is still open: <span className="text-white">{sessionTitle(session)}</span>
        </span>
      </span>
      <span className="link shrink-0">Back to the table</span>
    </Link>
  )
}
