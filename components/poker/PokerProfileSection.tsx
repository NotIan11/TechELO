'use client'

import { useMemo } from 'react'
import MoneyDelta from '@/components/ui/MoneyDelta'
import Segmented from '@/components/ui/Segmented'
import StatTile from '@/components/ui/StatTile'
import WinLossDots from '@/components/ui/WinLossDots'
import { KIND_OPTIONS, PERIOD_OPTIONS } from '@/lib/poker/constants'
import { formatCents, formatRoi, ordinal } from '@/lib/poker/money'
import { sessionResults, type PlayerSummary } from '@/lib/poker/stats'
import type { PokerCountedEntry, PokerKindFilter, PokerPeriod } from '@/lib/poker/types'

interface PokerProfileSectionProps {
  /** The player's counted entries, already narrowed to `kind` and `period` */
  entries: PokerCountedEntry[]
  /** `playerSummary(entries)`, computed once by the parent (it also feeds the headline figure) */
  summary: PlayerSummary
  kind: PokerKindFilter
  period: PokerPeriod
  onKindChange: (kind: PokerKindFilter) => void
  onPeriodChange: (period: PokerPeriod) => void
  className?: string
}

/**
 * "Poker in detail": the kind switch, the period select and every poker
 * statistic as a ruled grid. The headline net, the session list and the
 * tablemates live higher up the player page (figure, feed, most played against).
 */
export default function PokerProfileSection({ entries, summary, kind, period, onKindChange, onPeriodChange, className }: PokerProfileSectionProps) {
  const results = useMemo(() => sessionResults(entries, 10), [entries])
  const t = summary.tournament

  return (
    <section className={className} aria-labelledby="poker-detail">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-line-strong">
        <h2 id="poker-detail" className="flex min-h-[44px] items-center font-display text-xl font-normal text-white">
          Poker in detail
        </h2>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Segmented<PokerKindFilter> value={kind} onChange={onKindChange} options={KIND_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} className="border-b-0" />
          <select
            value={period}
            onChange={(e) => onPeriodChange(e.target.value as PokerPeriod)}
            aria-label="Period"
            className="mb-1.5 min-h-[44px] cursor-pointer rounded border border-line-strong bg-ink-950 px-3 text-sm text-white transition hover:border-line-bright focus:border-orange-500 focus:outline-none"
          >
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="border-b border-line py-5 text-sm text-mute">No sessions in this range.</p>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
            <StatTile label="ROI" value={formatRoi(summary.roiPct)} tone={summary.roiPct == null ? 'muted' : summary.roiPct >= 0 ? 'win' : 'loss'} />
            <StatTile label="Winning sessions" value={`${Math.round(summary.winningPct ?? 0)}%`} sub={`${summary.winningSessions} of ${summary.sessions}`} />
            <StatTile label="Biggest win" value={formatCents(summary.biggestWinCents, { compact: true })} tone={summary.biggestWinCents > 0 ? 'win' : 'muted'} />
            <StatTile label="Biggest loss" value={formatCents(summary.biggestLossCents, { compact: true })} tone={summary.biggestLossCents < 0 ? 'loss' : 'muted'} />
            <StatTile label="Cashed out" value={formatCents(summary.cashedOutCents, { compact: true })} />
            <StatTile label="Avg buy-in" value={formatCents(summary.avgBuyInCents, { compact: true })} />
            <StatTile label="Avg net / session" value={<MoneyDelta cents={summary.avgNetCents} size="lg" compact />} />
            <StatTile
              label="Per hour"
              value={summary.hourlyCents != null ? <MoneyDelta cents={summary.hourlyCents} size="lg" compact /> : '—'}
              sub={summary.hoursPlayed != null ? `${summary.hoursPlayed.toFixed(1)}h tracked` : 'no durations logged'}
            />
            <StatTile label="Longest heater" value={summary.longestWinStreak} sub="winning sessions in a row" tone={summary.longestWinStreak > 0 ? 'win' : 'muted'} />
            <StatTile label="Longest cooler" value={summary.longestLossStreak} sub="losing sessions in a row" tone={summary.longestLossStreak > 0 ? 'loss' : 'muted'} />
            <StatTile label="Rebuys" value={summary.totalRebuys} sub="total reloads" />
            <StatTile label="Form" value={results.length > 0 ? <WinLossDots form={results} className="text-base" /> : '—'} sub="most recent first" />
          </div>

          {t.entries > 0 && (
            <div className="mt-12">
              <h3 className="text-[13px] font-normal text-mute">Tournaments</h3>
              <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-7 sm:grid-cols-3 lg:grid-cols-6">
                <StatTile label="Entries" value={t.entries} />
                <StatTile label="Cashes" value={t.cashes} />
                <StatTile label="ITM" value={t.itmPct != null ? `${Math.round(t.itmPct)}%` : '—'} />
                <StatTile label="Best finish" value={t.bestFinish != null ? ordinal(t.bestFinish) : '—'} tone={t.bestFinish === 1 ? 'win' : 'default'} />
                <StatTile label="Titles" value={t.firstPlaces} tone={t.firstPlaces > 0 ? 'win' : 'muted'} />
                <StatTile label="Winnings" value={formatCents(t.winningsCents, { compact: true })} />
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
