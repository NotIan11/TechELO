import Link from 'next/link'
import { sessionTitle } from '@/lib/poker/stats'
import type { PokerSessionRow } from '@/lib/poker/types'

/** "You have a live game" strip shown on poker pages while the host has an open session */
export default function LiveSessionBanner({ session }: { session: PokerSessionRow | null }) {
  if (!session) return null
  return (
    <Link
      href={`/poker/sessions/${session.id}`}
      className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-loss/20 bg-loss/10 px-4 py-3 text-sm text-loss transition hover:bg-loss/10"
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-loss opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-loss" />
        </span>
        <span className="truncate">
          You have a live {session.kind === 'tournament' ? 'tournament' : 'cash game'}:{' '}
          <span className="font-semibold">{sessionTitle(session)}</span>
        </span>
      </span>
      <span className="shrink-0 font-semibold">Resume →</span>
    </Link>
  )
}
