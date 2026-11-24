import Link from 'next/link'
import { formatCents } from '@/lib/poker/money'
import { cn } from '@/lib/utils'
import type { RivalRow } from './activity'

function HeadToHead({ record }: { record: { wins: number; losses: number } | null }) {
  if (!record) return <span className="text-right text-zinc-600">—</span>
  return (
    <span className="text-right text-zinc-300">
      {record.wins}–{record.losses}
    </span>
  )
}

function Net({ cents }: { cents: number }) {
  return <span className={cents > 0 ? 'text-win' : cents < 0 ? 'text-loss' : 'text-mute'}>{formatCents(cents, { sign: true, compact: true })}</span>
}

/**
 * "Most played against": table-game head-to-head records (from the page
 * player's side) merged with poker tablemates. Columns with nothing in them
 * are left out. `subject` is "you" on your own page, a first name otherwise.
 */
export default function MostPlayed({ rows, subject }: { rows: RivalRow[]; subject: string }) {
  const hasPool = rows.some((r) => r.pool)
  const hasPingPong = rows.some((r) => r.pingPong)
  const hasPoker = rows.some((r) => r.poker)
  const columns = cn(
    'grid items-baseline gap-x-4',
    // Tailwind needs the full class names spelled out
    hasPool && hasPingPong && hasPoker && 'grid-cols-[minmax(0,1fr)_44px_44px_124px]',
    hasPool && hasPingPong && !hasPoker && 'grid-cols-[minmax(0,1fr)_64px_72px]',
    hasPool !== hasPingPong && hasPoker && 'grid-cols-[minmax(0,1fr)_56px_136px]',
    hasPool !== hasPingPong && !hasPoker && 'grid-cols-[minmax(0,1fr)_72px]',
    !hasPool && !hasPingPong && 'grid-cols-[minmax(0,1fr)_150px]'
  )
  const narrow = hasPool && hasPingPong && hasPoker

  return (
    <>
      <h2 className="flex min-h-[44px] items-center border-b border-line-strong font-sans text-sm font-normal tracking-normal text-mute">Most played against</h2>
      {rows.length === 0 ? (
        <p className="py-5 text-sm text-mute">Nobody yet. Opponents and tablemates show up here after the first confirmed result.</p>
      ) : (
        <div role="table" aria-label="Most played against">
          <div role="row" className={cn(columns, 'pb-2 pt-3 text-xs text-mute')}>
            <span role="columnheader" className="sr-only">
              Player
            </span>
            <span aria-hidden="true" />
            {hasPool && (
              <span role="columnheader" className="text-right">
                Pool
              </span>
            )}
            {hasPingPong && (
              <span role="columnheader" className="text-right">
                {narrow ? 'Pong' : 'Ping pong'}
              </span>
            )}
            {hasPoker && (
              <span role="columnheader" className="truncate text-right">
                Poker, {subject} · them
              </span>
            )}
          </div>
          {rows.map((r) => (
            <Link key={r.id} href={`/profile/${r.id}`} role="row" className={cn(columns, 'tabular min-h-[48px] border-t border-line py-3.5 text-sm transition hover:bg-white/[0.03]')}>
              <span role="cell" className="truncate font-sans text-white">
                {r.name}
              </span>
              {hasPool && (
                <span role="cell" className="text-right">
                  <HeadToHead record={r.pool} />
                </span>
              )}
              {hasPingPong && (
                <span role="cell" className="text-right">
                  <HeadToHead record={r.pingPong} />
                </span>
              )}
              {hasPoker && (
                <span role="cell" className="whitespace-nowrap text-right">
                  {r.poker ? (
                    <span title={`${r.poker.shared} shared session${r.poker.shared === 1 ? '' : 's'}`}>
                      <Net cents={r.poker.myNetCents} />
                      <span className="text-zinc-600"> · </span>
                      <Net cents={r.poker.theirNetCents} />
                    </span>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
