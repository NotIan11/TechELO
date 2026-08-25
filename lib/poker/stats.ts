/**
 * Pure derivations over poker entries. Mirrors lib/stats.ts for ELO: no extra
 * tables, everything computed from `poker_counted_entries` rows.
 */

import { SHARK_MIN_SESSIONS } from './constants'
import { formatCents, ordinal } from './money'
import { termLabel } from './periods'
import type {
  Award,
  PlayerRef,
  PokerCountedEntry,
  PokerEntryRow,
  PokerSessionRow,
} from './types'

export type SessionResult = 'W' | 'L' | 'E'

function playedTime(e: { played_at: string }): number {
  return new Date(e.played_at).getTime()
}

export function sortByPlayed<T extends { played_at: string; id: string }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => playedTime(a) - playedTime(b) || a.id.localeCompare(b.id))
}

export function resultOf(net: number): SessionResult {
  return net > 0 ? 'W' : net < 0 ? 'L' : 'E'
}

export interface StreakInfo {
  type: 'W' | 'L'
  count: number
}

export interface TournamentSummary {
  entries: number
  cashes: number
  itmPct: number | null
  bestFinish: number | null
  firstPlaces: number
  winningsCents: number
}

export interface PlayerSummary {
  sessions: number
  netCents: number
  stakedCents: number
  cashedOutCents: number
  roiPct: number | null
  winningSessions: number
  winningPct: number | null
  biggestWinCents: number
  biggestLossCents: number
  avgBuyInCents: number
  avgNetCents: number
  hoursPlayed: number | null
  hourlyCents: number | null
  totalRebuys: number
  currentStreak: StreakInfo | null
  longestWinStreak: number
  longestLossStreak: number
  tournament: TournamentSummary
}

export function emptySummary(): PlayerSummary {
  return {
    sessions: 0,
    netCents: 0,
    stakedCents: 0,
    cashedOutCents: 0,
    roiPct: null,
    winningSessions: 0,
    winningPct: null,
    biggestWinCents: 0,
    biggestLossCents: 0,
    avgBuyInCents: 0,
    avgNetCents: 0,
    hoursPlayed: null,
    hourlyCents: null,
    totalRebuys: 0,
    currentStreak: null,
    longestWinStreak: 0,
    longestLossStreak: 0,
    tournament: { entries: 0, cashes: 0, itmPct: null, bestFinish: null, firstPlaces: 0, winningsCents: 0 },
  }
}

/** All headline metrics for one player from their counted entries (any order). */
export function playerSummary(entries: PokerCountedEntry[]): PlayerSummary {
  if (entries.length === 0) return emptySummary()
  const sorted = sortByPlayed(entries)
  const n = sorted.length

  let net = 0
  let staked = 0
  let cashed = 0
  let winning = 0
  let biggestWin = 0
  let biggestLoss = 0
  let rebuys = 0
  let minutes = 0
  let timedNet = 0

  let currentType: 'W' | 'L' | null = null
  let currentCount = 0
  let longestW = 0
  let longestL = 0
  let runType: SessionResult | null = null
  let runCount = 0

  for (const e of sorted) {
    net += e.net_cents
    staked += e.buy_in_cents
    cashed += e.cash_out_cents ?? 0
    rebuys += e.rebuy_count
    if (e.net_cents > 0) winning++
    if (e.net_cents > biggestWin) biggestWin = e.net_cents
    if (e.net_cents < biggestLoss) biggestLoss = e.net_cents
    if (e.duration_minutes != null && e.duration_minutes > 0) {
      minutes += e.duration_minutes
      timedNet += e.net_cents
    }
    const r = resultOf(e.net_cents)
    if (r === runType && r !== 'E') {
      runCount++
    } else {
      runType = r
      runCount = r === 'E' ? 0 : 1
    }
    if (runType === 'W') longestW = Math.max(longestW, runCount)
    if (runType === 'L') longestL = Math.max(longestL, runCount)
  }

  // Current streak: walk back from the most recent session
  for (let i = n - 1; i >= 0; i--) {
    const r = resultOf(sorted[i].net_cents)
    if (r === 'E') break
    if (currentType == null) {
      currentType = r
      currentCount = 1
    } else if (r === currentType) {
      currentCount++
    } else {
      break
    }
  }

  const tourney = sorted.filter((e) => e.kind === 'tournament')
  const cashes = tourney.filter((e) => (e.cash_out_cents ?? 0) > 0).length
  const places = tourney.map((e) => e.finish_place).filter((p): p is number => p != null)

  const hours = minutes > 0 ? minutes / 60 : null

  return {
    sessions: n,
    netCents: net,
    stakedCents: staked,
    cashedOutCents: cashed,
    roiPct: staked > 0 ? (net / staked) * 100 : null,
    winningSessions: winning,
    winningPct: (winning / n) * 100,
    biggestWinCents: biggestWin,
    biggestLossCents: biggestLoss,
    avgBuyInCents: Math.round(staked / n),
    avgNetCents: Math.round(net / n),
    hoursPlayed: hours,
    hourlyCents: hours ? Math.round(timedNet / hours) : null,
    totalRebuys: rebuys,
    currentStreak: currentType ? { type: currentType, count: currentCount } : null,
    longestWinStreak: longestW,
    longestLossStreak: longestL,
    tournament: {
      entries: tourney.length,
      cashes,
      itmPct: tourney.length > 0 ? (cashes / tourney.length) * 100 : null,
      bestFinish: places.length > 0 ? Math.min(...places) : null,
      firstPlaces: places.filter((p) => p === 1).length,
      winningsCents: tourney.reduce((s, e) => s + (e.cash_out_cents ?? 0), 0),
    },
  }
}

export interface PnlPoint {
  sessionId: string
  playedAt: string
  netCents: number
  cumulativeCents: number
}

/** Cumulative PnL series, oldest → newest, for the chart. */
export function cumulativePnl(entries: PokerCountedEntry[]): PnlPoint[] {
  let running = 0
  return sortByPlayed(entries).map((e) => {
    running += e.net_cents
    return { sessionId: e.session_id, playedAt: e.played_at, netCents: e.net_cents, cumulativeCents: running }
  })
}

/** W/L results, most recent first (even sessions are skipped so the dots stay binary). */
export function sessionResults(entries: PokerCountedEntry[], limit = 10): ('W' | 'L')[] {
  return sortByPlayed(entries)
    .reverse()
    .map((e) => resultOf(e.net_cents))
    .filter((r): r is 'W' | 'L' => r !== 'E')
    .slice(0, limit)
}

/** Biggest winner of one session (null with < 2 rows or no positive net). */
export function binkOfTheNight<T extends { net_cents: number }>(entries: T[]): T | null {
  if (entries.length < 2) return null
  let best: T | null = null
  for (const e of entries) {
    if (e.net_cents > 0 && (best == null || e.net_cents > best.net_cents)) best = e
  }
  return best
}

export interface AckSummary {
  acked: number
  total: number
  disputed: number
  verified: boolean
}

export function ackSummary(entries: Pick<PokerEntryRow, 'acknowledged_at' | 'disputed_at'>[]): AckSummary {
  const total = entries.length
  const acked = entries.filter((e) => e.acknowledged_at != null).length
  const disputed = entries.filter((e) => e.disputed_at != null).length
  return { acked, total, disputed, verified: total > 0 && acked === total }
}

export function isVerified(s: Pick<PokerSessionRow, 'status' | 'player_count' | 'ack_count'>): boolean {
  return s.status === 'final' && s.player_count > 0 && s.ack_count === s.player_count
}

export interface SessionTotals {
  buyIn: number
  cashOut: number
  /** cash-outs (or payouts) minus what they should equal */
  discrepancy: number
  /** number of rows missing a cash-out (cash sessions) */
  missingCashOuts: number
}

export function computeTotals(
  entries: { buy_in_cents: number; cash_out_cents: number | null }[],
  prizePoolCents: number | null = null
): SessionTotals {
  const buyIn = entries.reduce((s, e) => s + e.buy_in_cents, 0)
  const cashOut = entries.reduce((s, e) => s + (e.cash_out_cents ?? 0), 0)
  const missing = entries.filter((e) => e.cash_out_cents == null).length
  return {
    buyIn,
    cashOut,
    discrepancy: cashOut - (prizePoolCents ?? buyIn),
    missingCashOuts: missing,
  }
}

/** Display title for a session: explicit title → official term title → stakes + variant → kind. */
export function sessionTitle(
  s: Pick<PokerSessionRow, 'title' | 'kind' | 'stakes' | 'variant' | 'is_official'> & {
    played_at?: string
    scheduled_for?: string | null
  }
): string {
  if (s.title) return s.title
  if (s.is_official) {
    const when = s.scheduled_for ?? s.played_at ?? new Date().toISOString()
    return `${termLabel(when)} Caltech Poker Tournament`
  }
  const bits = [s.stakes, s.variant].filter(Boolean)
  if (bits.length > 0) return bits.join(' ')
  return s.kind === 'tournament' ? 'Tournament' : 'Cash game'
}

// ---------------------------------------------------------------------------
// Group awards (Hall of Fame)
// ---------------------------------------------------------------------------

export interface AwardInput {
  /** Every counted entry in the period */
  entries: PokerCountedEntry[]
  /** Sessions in the period (for Biggest Night) */
  sessions: Pick<PokerSessionRow, 'id' | 'kind' | 'title' | 'stakes' | 'variant' | 'is_official' | 'played_at' | 'total_buy_in_cents' | 'player_count'>[]
  /** user id → display info */
  players: Map<string, PlayerRef>
  sharkMinSessions?: number
}

export function groupAwards({ entries, sessions, players, sharkMinSessions = SHARK_MIN_SESSIONS }: AwardInput): Award[] {
  const byUser = new Map<string, PokerCountedEntry[]>()
  for (const e of entries) {
    const list = byUser.get(e.user_id)
    if (list) list.push(e)
    else byUser.set(e.user_id, [e])
  }
  const summaries = new Map<string, PlayerSummary>()
  for (const [uid, list] of byUser) summaries.set(uid, playerSummary(list))

  // Bubble: finished exactly one place outside the money in a tournament
  const paidBySession = new Map<string, number>()
  for (const e of entries) {
    if (e.kind === 'tournament' && (e.cash_out_cents ?? 0) > 0) {
      paidBySession.set(e.session_id, (paidBySession.get(e.session_id) ?? 0) + 1)
    }
  }
  const bubbles = new Map<string, number>()
  for (const e of entries) {
    const paid = paidBySession.get(e.session_id) ?? 0
    if (e.kind === 'tournament' && paid > 0 && e.finish_place === paid + 1 && (e.cash_out_cents ?? 0) === 0) {
      bubbles.set(e.user_id, (bubbles.get(e.user_id) ?? 0) + 1)
    }
  }

  const holder = (uid: string | null): PlayerRef | null => (uid ? players.get(uid) ?? null : null)

  function best(
    pick: (s: PlayerSummary, uid: string) => number | null,
    opts: { min?: number; direction?: 'max' | 'min' } = {}
  ): { uid: string; value: number } | null {
    let out: { uid: string; value: number } | null = null
    for (const [uid, s] of summaries) {
      const v = pick(s, uid)
      if (v == null || !Number.isFinite(v)) continue
      if (opts.min != null && s.sessions < opts.min) continue
      if (out == null || (opts.direction === 'min' ? v < out.value : v > out.value)) out = { uid, value: v }
    }
    return out
  }

  const awards: Award[] = []

  const whale = best((s) => (s.stakedCents > 0 ? s.stakedCents : null))
  awards.push({
    key: 'whale',
    icon: 'whale',
    title: 'Whale',
    blurb: 'Most money put on the table',
    holder: holder(whale?.uid ?? null),
    valueLabel: whale ? formatCents(whale.value, { compact: true }) : '—',
  })

  const shark = best((s) => s.roiPct, { min: sharkMinSessions })
  awards.push({
    key: 'shark',
    icon: 'shark',
    title: 'Shark',
    blurb: `Best ROI (${sharkMinSessions}+ sessions)`,
    holder: holder(shark?.uid ?? null),
    valueLabel: shark ? `${shark.value > 0 ? '+' : ''}${Math.round(shark.value)}%` : '—',
  })

  const grinder = best((s) => s.sessions)
  awards.push({
    key: 'grinder',
    icon: 'grinder',
    title: 'Grinder',
    blurb: 'Most sessions played',
    holder: holder(grinder?.uid ?? null),
    valueLabel: grinder ? `${grinder.value} session${grinder.value === 1 ? '' : 's'}` : '—',
  })

  const heater = best((s) => (s.currentStreak?.type === 'W' ? s.currentStreak.count : null))
  awards.push({
    key: 'heater',
    icon: 'heater',
    title: 'Heater',
    blurb: 'Longest active winning streak',
    holder: holder(heater?.uid ?? null),
    valueLabel: heater ? `${heater.value} in a row` : '—',
  })

  let night: AwardInput['sessions'][number] | null = null
  for (const s of sessions) {
    if (s.total_buy_in_cents > 0 && (night == null || s.total_buy_in_cents > night.total_buy_in_cents)) night = s
  }
  awards.push({
    key: 'biggest_night',
    icon: 'night',
    title: 'Biggest Night',
    blurb: 'Largest session by money in',
    holder: null,
    sessionId: night?.id,
    sessionTitle: night ? sessionTitle(night) : undefined,
    valueLabel: night ? `${formatCents(night.total_buy_in_cents, { compact: true })} · ${night.player_count} players` : '—',
  })

  const reload = best((s) => (s.totalRebuys > 0 ? s.totalRebuys : null))
  awards.push({
    key: 'reload_king',
    icon: 'reload',
    title: 'Reload King',
    blurb: 'Most rebuys',
    holder: holder(reload?.uid ?? null),
    valueLabel: reload ? `${reload.value} reload${reload.value === 1 ? '' : 's'}` : '—',
  })

  let bubble: { uid: string; value: number } | null = null
  for (const [uid, count] of bubbles) {
    if (bubble == null || count > bubble.value) bubble = { uid, value: count }
  }
  awards.push({
    key: 'bubble_boy',
    icon: 'bubble',
    title: 'Bubble Boy',
    blurb: 'Most finishes one spot out of the money',
    holder: holder(bubble?.uid ?? null),
    valueLabel: bubble ? `${bubble.value}× bubbled` : '—',
  })

  const champ = best((s) => (s.tournament.firstPlaces > 0 ? s.tournament.firstPlaces : null))
  awards.push({
    key: 'champ',
    icon: 'champ',
    title: 'Champ',
    blurb: 'Most tournament titles',
    holder: holder(champ?.uid ?? null),
    valueLabel: champ ? `${champ.value} title${champ.value === 1 ? '' : 's'}` : '—',
  })

  const generous = best((s) => (s.netCents < 0 ? s.netCents : null), { direction: 'min' })
  awards.push({
    key: 'most_generous',
    icon: 'generous',
    title: 'Most Generous',
    blurb: 'Keeps the economy going',
    holder: holder(generous?.uid ?? null),
    valueLabel: generous ? formatCents(generous.value, { sign: true, compact: true }) : '—',
  })

  return awards
}

// ---------------------------------------------------------------------------
// Tablemates
// ---------------------------------------------------------------------------

export interface Tablemate {
  user: PlayerRef
  sharedSessions: number
  myNetCents: number
  theirNetCents: number
}

/**
 * Who `userId` plays with most. `entries` must contain every counted entry of
 * every session the user played (their own rows included).
 */
export function tablemates(
  userId: string,
  entries: PokerCountedEntry[],
  players: Map<string, PlayerRef>,
  limit = 5
): Tablemate[] {
  const mine = new Map<string, number>() // session_id → my net
  for (const e of entries) if (e.user_id === userId) mine.set(e.session_id, e.net_cents)

  const acc = new Map<string, { shared: number; myNet: number; theirNet: number }>()
  for (const e of entries) {
    if (e.user_id === userId) continue
    const myNet = mine.get(e.session_id)
    if (myNet == null) continue
    const cur = acc.get(e.user_id) ?? { shared: 0, myNet: 0, theirNet: 0 }
    cur.shared++
    cur.myNet += myNet
    cur.theirNet += e.net_cents
    acc.set(e.user_id, cur)
  }

  return Array.from(acc.entries())
    .map(([uid, v]) => ({
      user: players.get(uid) ?? { id: uid, display_name: 'Unknown', profile_image_url: null },
      sharedSessions: v.shared,
      myNetCents: v.myNet,
      theirNetCents: v.theirNet,
    }))
    .sort((a, b) => b.sharedSessions - a.sharedSessions || b.theirNetCents - a.theirNetCents)
    .slice(0, limit)
}

/** "3rd · $40" style label for a tournament result */
export function placeLabel(place: number | null): string {
  return place == null ? '—' : ordinal(place)
}
