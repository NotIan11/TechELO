import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import Icon from '@/components/ui/Icon'
import { sessionTitle } from '@/lib/poker/stats'
import type { PokerSessionRow } from '@/lib/poker/types'

/** "You have a live game" strip shown on poker pages while the host has an open session */
export default function LiveSessionBanner({ session }: { session: PokerSessionRow | null }) {
  if (!session) return null
  return (
    <Link
      href={`/poker/sessions/${session.id}`}
      className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-loss/20 bg-loss/5 px-4 py-3 text-sm text-zinc-200 transition hover:bg-loss/10"
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <Badge tone="live">Live</Badge>
        <span className="truncate">
          Your {session.kind === 'tournament' ? 'tournament' : 'cash game'}: <span className="font-semibold text-white">{sessionTitle(session)}</span>
        </span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-orange-400">
        Resume <Icon name="arrow-right" className="h-3.5 w-3.5" />
      </span>
    </Link>
  )
}
