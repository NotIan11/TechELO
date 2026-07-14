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
