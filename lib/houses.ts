/** House Cup standings: average rating of ranked players per house, shared by /dorms and the home page. */

import type { SupabaseClient } from '@supabase/supabase-js'

export interface HouseStanding {
  id: string
  name: string
  description: string | null
  total_members: number
  rankedPlayers: number
  avgRating: number
  totalWins: number
  totalMatches: number
}

export async function getHouseStandings(supabase: SupabaseClient): Promise<HouseStanding[]> {
  const [{ data: dorms }, { data: members }, { data: ratings }] = await Promise.all([
    supabase.from('dorms').select('*').order('name'),
    supabase.from('users').select('id, dorm_id').not('dorm_id', 'is', null),
    supabase.from('elo_ratings').select('user_id, rating, wins, matches_played').gt('matches_played', 0),
  ])

  const dormByUser = new Map((members ?? []).map((m) => [m.id, m.dorm_id]))
  const agg = new Map<string, { sum: number; n: number; wins: number; matches: number }>()
  for (const r of ratings ?? []) {
    const dormId = dormByUser.get(r.user_id)
    if (!dormId) continue
    const entry = agg.get(dormId) ?? { sum: 0, n: 0, wins: 0, matches: 0 }
    entry.sum += r.rating
    entry.n += 1
    entry.wins += r.wins
    entry.matches += r.matches_played
    agg.set(dormId, entry)
  }

  return (dorms ?? [])
    .map((dorm) => {
      const a = agg.get(dorm.id)
      return {
        id: dorm.id as string,
        name: dorm.name as string,
        description: (dorm.description as string | null) ?? null,
        total_members: dorm.total_members as number,
        rankedPlayers: a?.n ?? 0,
        avgRating: a && a.n > 0 ? Math.round(a.sum / a.n) : 0,
        totalWins: a?.wins ?? 0,
        totalMatches: a?.matches ?? 0,
      }
    })
    .sort((a, b) => b.avgRating - a.avgRating || b.totalWins - a.totalWins)
}
