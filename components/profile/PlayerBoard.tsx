'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import PokerProfileSection from '@/components/poker/PokerProfileSection'
import Button from '@/components/ui/Button'
import Figure from '@/components/ui/Figure'
import PnlChart from '@/components/ui/PnlChart'
import Segmented from '@/components/ui/Segmented'
import TextLink from '@/components/ui/TextLink'
import { formatCents } from '@/lib/poker/money'
import { periodBounds, periodLabel } from '@/lib/poker/periods'
import { cumulativePnl, playerSummary } from '@/lib/poker/stats'
import type { PokerCountedEntry, PokerKindFilter, PokerPeriod } from '@/lib/poker/types'
import { cn } from '@/lib/utils'
import { FIGURE_CELL, GAME_NAMES, type FeedGame, type FeedItem, type Tone } from './activity'

interface PlayerBoardProps {
  displayName: string
  isOwnProfile: boolean
  /** The pool and ping pong figure cells, rendered on the server */
  tableFigures: React.ReactNode
  /** The "most played against" column, rendered on the server */
  aside: React.ReactNode
  feed: FeedItem[]
  /** The player's counted poker entries (all time) */
  entries: PokerCountedEntry[]
}

type FeedFilter = 'all' | FeedGame

const FEED_OPTIONS: { value: FeedFilter; label: string }[] = [
  { value: 'all', label: 'Everything' },
  { value: 'pool', label: GAME_NAMES.pool },
  { value: 'ping_pong', label: GAME_NAMES.ping_pong },
  { value: 'poker', label: GAME_NAMES.poker },
]

const TONES: Record<Tone, string> = { win: 'text-win', loss: 'text-loss', warn: 'text-warn', mute: 'text-mute' }
const PAGE = 12

/**
 * Everything under the player's name: the three headline figures, the activity
 * feed beside "most played against", and poker in detail. Client-side because
 * the poker kind/period controls drive both the poker figure and the detail grid.
 */
export default function PlayerBoard({ displayName, isOwnProfile, tableFigures, aside, feed, entries }: PlayerBoardProps) {
  const [kind, setKind] = useState<PokerKindFilter>('all')
  const [period, setPeriod] = useState<PokerPeriod>('all')
  const [filter, setFilter] = useState<FeedFilter>('all')
  const [shown, setShown] = useState(PAGE)

  const filtered = useMemo(() => {
    const { since } = periodBounds(period)
    const sinceT = since ? new Date(since).getTime() : null
    return entries.filter((e) => (kind === 'all' || e.kind === kind) && (sinceT == null || new Date(e.played_at).getTime() >= sinceT))
  }, [entries, kind, period])
  const summary = useMemo(() => playerSummary(filtered), [filtered])
  const series = useMemo(() => cumulativePnl(filtered).map((p) => p.cumulativeCents), [filtered])

  const rows = useMemo(() => (filter === 'all' ? feed : feed.filter((f) => f.game === filter)), [feed, filter])
  const visible = rows.slice(0, shown)

  const pokerLabel = `${kind === 'cash' ? 'Poker cash' : kind === 'tournament' ? 'Poker tournaments' : 'Poker'}, ${periodLabel(period)}`
  const streak = summary.currentStreak

  return (
    <>
      <div className="mt-10 grid border-b border-t border-line-strong border-t-line-bright md:grid-cols-3">
        {tableFigures}
        <div className={FIGURE_CELL}>
          {entries.length === 0 ? (
            <Figure label="Poker" aside="No sessions" value="$0" tone="muted" size="lg">
              <p className="mt-4 max-w-[280px]">
                {isOwnProfile ? 'No sessions logged. Net, ROI and streaks show up after the first one.' : `${displayName} has not played a logged session yet.`}
              </p>
              {isOwnProfile && (
                <TextLink href="/poker/sessions/new" className="min-h-[44px] text-[13px]">
                  Start a session
                </TextLink>
              )}
            </Figure>
          ) : filtered.length === 0 ? (
            <Figure label={pokerLabel} aside="0 nights" value="$0" tone="muted" size="lg">
              <p className="mt-4">No sessions in this range.</p>
            </Figure>
          ) : (
            <Figure
              label={pokerLabel}
              aside={
                <>
                  <span className="tabular">{summary.sessions}</span> night{summary.sessions === 1 ? '' : 's'} ·{' '}
                  <span className="tabular">{formatCents(summary.stakedCents, { compact: true })}</span> staked
                </>
              }
              value={formatCents(summary.netCents, { sign: true, compact: true })}
              tone={summary.netCents > 0 ? 'win' : summary.netCents < 0 ? 'loss' : 'muted'}
              size="lg"
            >
              {series.length >= 2 && <PnlChart values={series} className={cn('mt-4 h-12', summary.netCents >= 0 ? 'text-win' : 'text-loss')} />}
              <p className="mt-2 flex flex-wrap justify-between gap-x-3 text-xs text-mute">
                <span>
                  <span className="tabular">{summary.winningSessions}</span> winning night{summary.winningSessions === 1 ? '' : 's'} of{' '}
                  <span className="tabular">{summary.sessions}</span>
                </span>
                {summary.hourlyCents != null && (
                  <span className={cn('tabular', summary.hourlyCents > 0 ? 'text-win' : summary.hourlyCents < 0 ? 'text-loss' : undefined)}>
                    {formatCents(summary.hourlyCents, { sign: true, compact: true })} an hour
                  </span>
                )}
              </p>
              {streak && streak.count >= 2 && (
                <p className={cn('mt-1 text-xs', streak.type === 'W' ? 'text-win' : 'text-loss')}>
                  <span className="tabular">{streak.count}</span>-session {streak.type === 'W' ? 'heater' : 'cooler'}
                </p>
              )}
            </Figure>
          )}
        </div>
      </div>

      <div className="mt-14 grid gap-x-[72px] gap-y-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
        <section aria-label="Activity" className="min-w-0">
          <Segmented<FeedFilter>
            value={filter}
            onChange={(v) => {
              setFilter(v)
              setShown(PAGE)
            }}
            options={FEED_OPTIONS}
            className="flex gap-7"
          />
          {rows.length === 0 ? (
            feed.length === 0 ? (
              <div className="border-b border-line py-8">
                <h3 className="font-display text-2xl font-normal text-white">No completed matches</h3>
                <p className="mt-2 max-w-md text-[15px] text-zinc-400">
                  {isOwnProfile ? 'Confirmed matches show up here with the rating change.' : `${displayName} has not completed any matches yet.`}
                </p>
                {isOwnProfile && (
                  <div className="mt-6">
                    <Button href="/play">Challenge someone</Button>
                  </div>
                )}
              </div>
            ) : (
              <p className="border-b border-line py-5 text-sm text-mute">
                {filter === 'poker' ? 'No logged poker sessions yet.' : `No completed ${GAME_NAMES[filter as FeedGame].toLowerCase()} matches yet.`}
              </p>
            )
          ) : (
            <ul>
              {visible.map((f) => (
                <li key={f.key}>
                  <Link href={f.href} className="flex min-h-[48px] items-baseline gap-4 border-b border-line py-3.5 transition hover:bg-white/[0.03] sm:gap-5">
                    <span className="tabular w-[60px] shrink-0 text-xs text-mute">{f.date}</span>
                    <span className="hidden w-[60px] shrink-0 text-xs text-mute sm:block">{GAME_NAMES[f.game]}</span>
                    <span className="min-w-0 flex-1 text-sm text-white">
                      <span className="mr-2 text-xs text-mute sm:hidden">{GAME_NAMES[f.game]}</span>
                      {f.text}
                      {f.note && <span className={cn('ml-2 whitespace-nowrap text-xs', TONES[f.note.tone])}>{f.note.text}</span>}
                    </span>
                    <span className={cn('tabular shrink-0 text-sm', TONES[f.tone])}>{f.value}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {rows.length > shown && (
            <button type="button" onClick={() => setShown((n) => n + PAGE * 2)} className="mt-1 inline-flex min-h-[44px] items-center text-[13px] text-mute transition hover:text-white">
              Show older · <span className="tabular ml-1">{rows.length - shown}</span>
            </button>
          )}
        </section>

        <aside className="min-w-0">{aside}</aside>
      </div>

      {entries.length > 0 && (
        <PokerProfileSection
          className="mt-16"
          entries={filtered}
          summary={summary}
          kind={kind}
          period={period}
          onKindChange={setKind}
          onPeriodChange={setPeriod}
        />
      )}
    </>
  )
}
