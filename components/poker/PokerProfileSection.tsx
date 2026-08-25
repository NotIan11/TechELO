'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import GameIcon from '@/components/ui/GameIcon'
import MoneyDelta from '@/components/ui/MoneyDelta'
import PnlChart from '@/components/ui/PnlChart'
import Segmented from '@/components/ui/Segmented'
import StatTile from '@/components/ui/StatTile'
import WinLossDots from '@/components/ui/WinLossDots'
import { KIND_OPTIONS, PERIOD_OPTIONS } from '@/lib/poker/constants'
import { formatCents, formatRoi, ordinal } from '@/lib/poker/money'
import { formatPokerDateTime, periodBounds } from '@/lib/poker/periods'
import { cumulativePnl, playerSummary, sessionResults, sessionTitle, sortByPlayed, tablemates } from '@/lib/poker/stats'
import type { PlayerRef, PokerCountedEntry, PokerKindFilter, PokerPeriod } from '@/lib/poker/types'
import { cn } from '@/lib/utils'

interface PokerProfileSectionProps {
  userId: string
  displayName: string
  isOwnProfile: boolean
  /** The profile user's counted entries (all time) */
  entries: PokerCountedEntry[]
  /** Every counted entry in the sessions the user played (for tablemates) */
  tableEntries: PokerCountedEntry[]
  players: Record<string, PlayerRef>
}

export default function PokerProfileSection({ userId, displayName, isOwnProfile, entries, tableEntries, players }: PokerProfileSectionProps) {
  const [kind, setKind] = useState<PokerKindFilter>('all')
  const [period, setPeriod] = useState<PokerPeriod>('all')

  const filtered = useMemo(() => {
    const { since } = periodBounds(period)
    const sinceT = since ? new Date(since).getTime() : null
    return entries.filter((e) => (kind === 'all' || e.kind === kind) && (sinceT == null || new Date(e.played_at).getTime() >= sinceT))
  }, [entries, kind, period])

  const summary = useMemo(() => playerSummary(filtered), [filtered])
  const series = useMemo(() => cumulativePnl(filtered), [filtered])
  const results = useMemo(() => sessionResults(filtered, 10), [filtered])
  const mates = useMemo(() => {
    const ids = new Set(filtered.map((e) => e.session_id))
    const playersMap = new Map(Object.entries(players))
    return tablemates(userId, tableEntries.filter((e) => ids.has(e.session_id)), playersMap, 5)
  }, [filtered, tableEntries, players, userId])
  const recent = useMemo(() => sortByPlayed(filtered).reverse().slice(0, 8), [filtered])

  if (entries.length === 0) {
    return (
      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-white">
            <GameIcon game="poker" className="h-5 w-5 text-poker" />
            Poker
          </h2>
          {isOwnProfile ? (
            <Button href="/poker/sessions/new" size="sm" variant="secondary">
              Start a session
            </Button>
          ) : null}
        </div>
        <p className="mt-2 text-sm text-slate-500">
          {isOwnProfile ? 'No logged sessions yet — your PnL, ROI and streaks show up here after your first night.' : `${displayName} hasn’t played a logged session yet.`}
        </p>
      </Card>
    )
  }

  const t = summary.tournament

  return (
    <Card className="mb-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-white">
          <GameIcon game="poker" className="h-5 w-5 text-poker" />
          Poker
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented<PokerKindFilter> value={kind} onChange={setKind} options={KIND_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
          <select value={period} onChange={(e) => setPeriod(e.target.value as PokerPeriod)} aria-label="Period" className="input w-auto cursor-pointer">
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-500">No sessions in this range.</p>
      ) : (
        <>
          {/* Headline + chart */}
          <div className="grid gap-5 md:grid-cols-[auto_1fr] md:items-end">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">Net</p>
              <MoneyDelta cents={summary.netCents} size="xl" compact />
              <p className="mt-1 text-xs text-slate-500">
                {summary.sessions} session{summary.sessions === 1 ? '' : 's'} · {formatCents(summary.stakedCents, { compact: true })} staked
              </p>
              {summary.currentStreak && summary.currentStreak.count >= 2 && (
                <span
                  className={cn(
                    'mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                    summary.currentStreak.type === 'W' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'
                  )}
                >
                  {summary.currentStreak.type === 'W' ? '🔥' : '🧊'} {summary.currentStreak.count} session {summary.currentStreak.type === 'W' ? 'heater' : 'cooler'}
                </span>
              )}
            </div>
            <div className="text-poker">
              <PnlChart values={series.map((p) => p.cumulativeCents)} />
              <div className="mt-1 flex justify-between text-[11px] text-slate-500">
                <span>{series.length > 0 ? formatPokerDateTime(series[0].playedAt, false) : ''}</span>
                <span>{series.length > 1 ? formatPokerDateTime(series[series.length - 1].playedAt, false) : ''}</span>
              </div>
            </div>
          </div>

          {/* Tiles */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <StatTile label="ROI" value={formatRoi(summary.roiPct)} tone={summary.roiPct == null ? 'muted' : summary.roiPct >= 0 ? 'positive' : 'negative'} />
            <StatTile label="Winning sessions" value={`${Math.round(summary.winningPct ?? 0)}%`} sub={`${summary.winningSessions} of ${summary.sessions}`} />
            <StatTile label="Biggest win" value={formatCents(summary.biggestWinCents, { compact: true })} tone={summary.biggestWinCents > 0 ? 'positive' : 'muted'} />
            <StatTile label="Biggest loss" value={formatCents(summary.biggestLossCents, { compact: true })} tone={summary.biggestLossCents < 0 ? 'negative' : 'muted'} />
            <StatTile label="Cashed out" value={formatCents(summary.cashedOutCents, { compact: true })} />
            <StatTile label="Avg buy-in" value={formatCents(summary.avgBuyInCents, { compact: true })} />
            <StatTile label="Avg net / session" value={<MoneyDelta cents={summary.avgNetCents} size="lg" compact />} />
            <StatTile
              label="Per hour"
              value={summary.hourlyCents != null ? <MoneyDelta cents={summary.hourlyCents} size="lg" compact /> : '—'}
              sub={summary.hoursPlayed != null ? `${summary.hoursPlayed.toFixed(1)}h tracked` : 'no durations logged'}
            />
            <StatTile label="Longest heater" value={summary.longestWinStreak} sub="winning sessions in a row" tone={summary.longestWinStreak > 0 ? 'positive' : 'muted'} />
            <StatTile label="Longest cooler" value={summary.longestLossStreak} sub="losing sessions in a row" tone={summary.longestLossStreak > 0 ? 'negative' : 'muted'} />
            <StatTile label="Rebuys" value={summary.totalRebuys} sub="total reloads" />
            <StatTile label="Form" value={results.length > 0 ? <WinLossDots form={results} className="mt-1" /> : '—'} sub="most recent first" />
          </div>

          {/* Tournaments */}
          {t.entries > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Tournaments</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <StatTile label="Entries" value={t.entries} />
                <StatTile label="Cashes" value={t.cashes} />
                <StatTile label="ITM" value={t.itmPct != null ? `${Math.round(t.itmPct)}%` : '—'} />
                <StatTile label="Best finish" value={t.bestFinish != null ? ordinal(t.bestFinish) : '—'} tone={t.bestFinish === 1 ? 'positive' : 'default'} />
                <StatTile label="Titles" value={t.firstPlaces} tone={t.firstPlaces > 0 ? 'positive' : 'muted'} />
                <StatTile label="Winnings" value={formatCents(t.winningsCents, { compact: true })} />
              </div>
            </div>
          )}

          {/* Tablemates + recent */}
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Tablemates</h3>
              {mates.length === 0 ? (
                <p className="text-sm text-slate-500">No shared tables yet.</p>
              ) : (
                <ul className="space-y-1">
                  {mates.map((m) => (
                    <li key={m.user.id}>
                      <Link href={`/profile/${m.user.id}`} className="flex items-center justify-between gap-3 rounded-lg p-2 transition hover:bg-white/[0.04]">
                        <span className="flex min-w-0 items-center gap-2.5">
                          <Avatar src={m.user.profile_image_url} name={m.user.display_name} size="xs" />
                          <span className="truncate text-sm text-white">{m.user.display_name}</span>
                          <span className="shrink-0 text-xs text-slate-500">{m.sharedSessions}×</span>
                        </span>
                        <span className="tabular flex shrink-0 items-center gap-1.5 text-xs text-slate-400">
                          <span title={`${displayName} at those tables`}>
                            <MoneyDelta cents={m.myNetCents} size="xs" compact />
                          </span>
                          <span className="text-slate-600">vs</span>
                          <span title={`${m.user.display_name} at those tables`}>
                            <MoneyDelta cents={m.theirNetCents} size="xs" compact />
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Recent sessions</h3>
              <ul className="space-y-1">
                {recent.map((e) => (
                  <li key={e.id}>
                    <Link href={`/poker/sessions/${e.session_id}`} className="flex items-center justify-between gap-3 rounded-lg p-2 transition hover:bg-white/[0.04]">
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm text-white">{sessionTitle(e)}</span>
                          {e.kind === 'tournament' && e.finish_place != null && (
                            <Badge tone={e.finish_place === 1 ? 'yellow' : 'gray'}>{ordinal(e.finish_place)}</Badge>
                          )}
                          {e.status === 'disputed' && <Badge tone="red">Disputed</Badge>}
                        </span>
                        <span className="block text-xs text-slate-500">{formatPokerDateTime(e.played_at, false)}</span>
                      </span>
                      <MoneyDelta cents={e.net_cents} chip compact />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </Card>
  )
}
