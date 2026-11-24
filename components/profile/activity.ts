/**
 * Pure helpers behind the player page: the interleaved activity feed, the
 * "most played against" table and the per-game rating trend. Everything is
 * derived from rows the page already loads.
 */

import { ordinal, formatCents } from '@/lib/poker/money'
import { TIME_ZONE } from '@/lib/poker/periods'
import { sessionTitle, type Tablemate } from '@/lib/poker/stats'
import { currentStreak, ratingHistory, recentForm, type FormResult } from '@/lib/stats'
import type { PokerCountedEntry } from '@/lib/poker/types'

interface MatchPlayer {
  id: string
  display_name: string
  profile_image_url?: string | null
}

/** A completed match with both players joined, as the player page selects it */
export interface ProfileMatch {
  id: string
  game_type: string
  status: string
  player1_id: string
  player2_id: string
  winner_id: string | null
  player1_elo_before: number | null
  player2_elo_before: number | null
  player1_elo_after: number | null
  player2_elo_after: number | null
  created_at: string
  completed_at: string | null
  player1: MatchPlayer | null
  player2: MatchPlayer | null
}

export type TableGame = 'pool' | 'ping_pong'
export type FeedGame = TableGame | 'poker'
export type Tone = 'win' | 'loss' | 'warn' | 'mute'

/** Shared cell of the three-figure row: stacked with rules on phones, vertical hairlines from md up */
export const FIGURE_CELL =
  'min-w-0 border-t border-line py-6 first:border-t-0 md:border-l md:border-t-0 md:px-8 md:first:border-l-0 md:first:pl-0 md:last:pr-0'

export const GAME_NAMES: Record<FeedGame, string> = { pool: 'Pool', ping_pong: 'Ping pong', poker: 'Poker' }

export interface FeedItem {
  key: string
  at: number
  /** Already formatted in TIME_ZONE so server and client agree */
  date: string
  game: FeedGame
  text: string
  note?: { text: string; tone: Tone }
  value: string
  tone: Tone
  href: string
}

const MINUS = '−'
const DAY_MS = 24 * 60 * 60 * 1000

function matchTime(m: ProfileMatch): number {
  return new Date(m.completed_at || m.created_at).getTime()
}

function myDelta(m: ProfileMatch, userId: string): number | null {
  const first = m.player1_id === userId
  const before = first ? m.player1_elo_before : m.player2_elo_before
  const after = first ? m.player1_elo_after : m.player2_elo_after
  return before != null && after != null ? after - before : null
}

function feedDate(at: number, thisYear: string): string {
  const d = new Date(at)
  const year = d.toLocaleDateString('en-US', { timeZone: TIME_ZONE, year: 'numeric' })
  return year === thisYear
    ? d.toLocaleDateString('en-US', { timeZone: TIME_ZONE, month: 'short', day: 'numeric' })
    : d.toLocaleDateString('en-US', { timeZone: TIME_ZONE, month: 'short', year: 'numeric' })
}

/** Month and year a player joined, e.g. "Sep 2026" */
export function sinceLabel(date: string): string {
  return new Date(date).toLocaleDateString('en-US', { timeZone: TIME_ZONE, month: 'short', year: 'numeric' })
}

/**
 * Completed matches and counted poker entries in one list, newest first.
 * `viewerIsPlayer` turns on the "waiting on you" note for unconfirmed poker lines.
 */
export function buildFeed(
  matches: ProfileMatch[],
  entries: PokerCountedEntry[],
  userId: string,
  viewerIsPlayer: boolean,
  pokerLimit = 200
): FeedItem[] {
  const thisYear = new Date().toLocaleDateString('en-US', { timeZone: TIME_ZONE, year: 'numeric' })
  const items: FeedItem[] = []

  for (const m of matches) {
    if (m.game_type !== 'pool' && m.game_type !== 'ping_pong') continue
    const opponent = m.player1_id === userId ? m.player2 : m.player1
    const name = opponent?.display_name ?? 'Unknown'
    const delta = myDelta(m, userId)
    const at = matchTime(m)
    const decided = m.winner_id != null
    const won = m.winner_id === userId
    items.push({
      key: `m-${m.id}`,
      at,
      date: feedDate(at, thisYear),
      game: m.game_type,
      text: !decided ? name : won ? `Beat ${name}` : `Lost to ${name}`,
      note: !decided ? { text: 'no result', tone: 'mute' } : undefined,
      value: delta == null ? '—' : delta === 0 ? '0' : `${delta > 0 ? '+' : MINUS}${Math.abs(delta)}`,
      tone: delta == null || delta === 0 ? 'mute' : delta > 0 ? 'win' : 'loss',
      href: `/matches/${m.id}`,
    })
  }

  const recentPoker = [...entries].sort((a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime()).slice(0, pokerLimit)
  for (const e of recentPoker) {
    const at = new Date(e.played_at).getTime()
    const detail =
      e.kind === 'tournament' && e.finish_place != null
        ? `${ordinal(e.finish_place)} of ${e.player_count}`
        : `${e.player_count} player${e.player_count === 1 ? '' : 's'}`
    let note: FeedItem['note']
    if (e.disputed_at != null) note = { text: viewerIsPlayer ? 'you disputed this' : 'disputed', tone: 'loss' }
    else if (e.status === 'disputed') note = { text: 'disputed', tone: 'loss' }
    else if (viewerIsPlayer && e.acknowledged_at == null) note = { text: 'waiting on you', tone: 'warn' }
    const net = Number(e.net_cents)
    items.push({
      key: `p-${e.id}`,
      at,
      date: feedDate(at, thisYear),
      game: 'poker',
      text: `${sessionTitle(e)}, ${detail}`,
      note,
      value: formatCents(net, { sign: true, compact: true }),
      tone: net > 0 ? 'win' : net < 0 ? 'loss' : 'mute',
      href: `/poker/sessions/${e.session_id}`,
    })
  }

  return items.sort((a, b) => b.at - a.at)
}

export interface GameTrend {
  /** Rating after each loaded match, oldest first */
  history: number[]
  peak: number | null
  /** Rating points gained or lost in the last 30 days; null with no match in that window */
  change30: number | null
  form: FormResult[]
  streak: { type: FormResult; count: number } | null
}

export function gameTrend(matches: ProfileMatch[], userId: string, game: TableGame, currentRating: number): GameTrend {
  const history = ratingHistory(matches, userId, game)
  const form = recentForm(matches, userId, game)
  const cutoff = Date.now() - 30 * DAY_MS
  let change30: number | null = null
  for (const m of matches) {
    if (m.game_type !== game || m.winner_id == null || matchTime(m) < cutoff) continue
    const delta = myDelta(m, userId)
    if (delta != null) change30 = (change30 ?? 0) + delta
  }
  return {
    history,
    peak: history.length > 0 ? Math.max(currentRating, ...history) : null,
    change30,
    form,
    streak: currentStreak(form),
  }
}

export interface RivalRow {
  id: string
  name: string
  pool: { wins: number; losses: number } | null
  pingPong: { wins: number; losses: number } | null
  poker: { shared: number; myNetCents: number; theirNetCents: number } | null
  encounters: number
}

/** Head-to-head table records merged with poker tablemates, most encounters first */
export function buildRivals(matches: ProfileMatch[], userId: string, mates: Tablemate[], limit = 8): RivalRow[] {
  const rows = new Map<string, RivalRow>()
  const rowFor = (id: string, name: string) => {
    let row = rows.get(id)
    if (!row) {
      row = { id, name, pool: null, pingPong: null, poker: null, encounters: 0 }
      rows.set(id, row)
    }
    return row
  }

  for (const m of matches) {
    if (m.winner_id == null) continue
    if (m.game_type !== 'pool' && m.game_type !== 'ping_pong') continue
    const opponent = m.player1_id === userId ? m.player2 : m.player1
    if (!opponent) continue
    const row = rowFor(opponent.id, opponent.display_name)
    const key = m.game_type === 'pool' ? 'pool' : 'pingPong'
    const record = row[key] ?? { wins: 0, losses: 0 }
    if (m.winner_id === userId) record.wins++
    else record.losses++
    row[key] = record
    row.encounters++
  }

  for (const mate of mates) {
    const row = rowFor(mate.user.id, mate.user.display_name)
    row.poker = { shared: mate.sharedSessions, myNetCents: mate.myNetCents, theirNetCents: mate.theirNetCents }
    row.encounters += mate.sharedSessions
  }

  return Array.from(rows.values())
    .sort((a, b) => b.encounters - a.encounters || a.name.localeCompare(b.name))
    .slice(0, limit)
}
