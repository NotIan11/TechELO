/**
 * Derived player stats computed from completed matches (no extra tables needed).
 */

export interface CompletedMatchLike {
  player1_id: string
  player2_id: string
  winner_id: string | null
  player1_elo_before: number | null
  player2_elo_before: number | null
  player1_elo_after: number | null
  player2_elo_after: number | null
  game_type: string
  completed_at: string | null
  created_at: string
}

export type FormResult = 'W' | 'L'

function completedTime(m: CompletedMatchLike): number {
  return new Date(m.completed_at || m.created_at).getTime()
}

/** W/L results for a user, most recent first */
export function recentForm(
  matches: CompletedMatchLike[],
  userId: string,
  gameType?: string,
  limit = 5
): FormResult[] {
  return matches
    .filter(
      (m) =>
        m.winner_id != null &&
        (gameType == null || m.game_type === gameType) &&
        (m.player1_id === userId || m.player2_id === userId)
    )
    .sort((a, b) => completedTime(b) - completedTime(a))
    .slice(0, limit)
    .map((m) => (m.winner_id === userId ? 'W' : 'L'))
}

/** Current win/loss streak, computed from most-recent-first results */
export function currentStreak(form: FormResult[]): { type: FormResult; count: number } | null {
  if (form.length === 0) return null
  const type = form[0]
  let count = 0
  for (const r of form) {
    if (r !== type) break
    count++
  }
  return { type, count }
}

/**
 * Rating trajectory for a user in one game, oldest -> newest.
 * Starts at the "before" rating of their first completed match, then each
 * match's "after" rating. Empty if they have no completed matches.
 */
export function ratingHistory(
  matches: CompletedMatchLike[],
  userId: string,
  gameType: string
): number[] {
  const completed = matches
    .filter(
      (m) =>
        m.game_type === gameType &&
        m.winner_id != null &&
        (m.player1_id === userId || m.player2_id === userId)
    )
    .sort((a, b) => completedTime(a) - completedTime(b))

  if (completed.length === 0) return []

  const first = completed[0]
  const startRating =
    (first.player1_id === userId ? first.player1_elo_before : first.player2_elo_before) ?? 1500

  const history = [startRating]
  for (const m of completed) {
    const after = m.player1_id === userId ? m.player1_elo_after : m.player2_elo_after
    if (after != null) history.push(after)
  }
  return history
}

/** A user's rating change in one completed match (null if they did not play or it has no "after" rating) */
export function ratingChangeFor(m: CompletedMatchLike, userId: string): number | null {
  if (m.winner_id == null) return null
  if (m.player1_id === userId) {
    return m.player1_elo_after != null && m.player1_elo_before != null ? m.player1_elo_after - m.player1_elo_before : null
  }
  if (m.player2_id === userId) {
    return m.player2_elo_after != null && m.player2_elo_before != null ? m.player2_elo_after - m.player2_elo_before : null
  }
  return null
}

/**
 * Net rating change per player across completed matches finished at or after
 * `since`. Players with no match in the window are absent from the result.
 */
export function ratingChangesSince(
  matches: CompletedMatchLike[],
  since: Date | number,
  gameType?: string
): Record<string, number> {
  const sinceMs = typeof since === 'number' ? since : since.getTime()
  const out: Record<string, number> = {}
  for (const m of matches) {
    if (m.winner_id == null) continue
    if (gameType != null && m.game_type !== gameType) continue
    if (completedTime(m) < sinceMs) continue
    for (const id of [m.player1_id, m.player2_id]) {
      const change = ratingChangeFor(m, id)
      if (change != null) out[id] = (out[id] ?? 0) + change
    }
  }
  return out
}

/** Wins for each of two players in the completed matches between them */
export function headToHead(
  matches: CompletedMatchLike[],
  aId: string,
  bId: string,
  gameType?: string
): { aWins: number; bWins: number } {
  let aWins = 0
  let bWins = 0
  for (const m of matches) {
    if (m.winner_id == null) continue
    if (gameType != null && m.game_type !== gameType) continue
    const between = (m.player1_id === aId && m.player2_id === bId) || (m.player1_id === bId && m.player2_id === aId)
    if (!between) continue
    if (m.winner_id === aId) aWins++
    else if (m.winner_id === bId) bWins++
  }
  return { aWins, bWins }
}

export interface RatedPlayer {
  user_id: string
  rating: number
  matches_played: number
  wins: number
}

/**
 * Rank per player for one game, using the leaderboard's own order: rating,
 * then wins, among players with at least one confirmed match.
 */
export function rankByRating(players: RatedPlayer[]): Record<string, number> {
  const ranked = players.filter((p) => p.matches_played > 0).sort((a, b) => b.rating - a.rating || b.wins - a.wins)
  const out: Record<string, number> = {}
  ranked.forEach((p, i) => {
    out[p.user_id] = i + 1
  })
  return out
}

const COUNT_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']

/** Small counts spelled out ("three"); larger ones stay as digits */
export function countWord(n: number): string {
  return Number.isInteger(n) && n >= 0 && n < COUNT_WORDS.length ? COUNT_WORDS[n] : String(n)
}

/** The instant `days` days before `now` (defaults to the present) */
export function daysAgo(days: number, now: Date = new Date()): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
}
