/** Pure helpers for guest players (host-created placeholders without an account). Client-safe. */

import type { GuestRef, PlayerRefWithHouse } from './types'

/** Show a guest where the UI expects a player: initials avatar, no profile link. */
export function guestAsPlayer(g: Pick<GuestRef, 'id' | 'name'>): PlayerRefWithHouse {
  return { id: g.id, display_name: g.name, profile_image_url: null, guest: true, dorm_name: null }
}

function tokens(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2)
}

/**
 * Registered players whose name shares a word with the guest's name, best
 * match first. Used to pre-fill the "link account" search.
 */
export function suggestMatches<T extends { display_name: string }>(guestName: string, players: T[], limit = 3): T[] {
  const want = tokens(guestName)
  if (want.length === 0) return []
  const scored: { p: T; score: number }[] = []
  for (const p of players) {
    const have = tokens(p.display_name)
    let score = 0
    for (const w of want) {
      if (have.includes(w)) score += 2
      else if (have.some((h) => h.startsWith(w) || w.startsWith(h))) score += 1
    }
    if (score > 0) scored.push({ p, score })
  }
  return scored
    .sort((a, b) => b.score - a.score || a.p.display_name.localeCompare(b.p.display_name))
    .slice(0, limit)
    .map((s) => s.p)
}
