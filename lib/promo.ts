/**
 * Small, cached loaders behind the home screen and the page ledes: who leads,
 * where the viewer stands, what is live. Every loader tolerates a database
 * without migration 013.
 */

import { cache } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { periodBounds } from '@/lib/poker/periods'
import { sessionTitle } from '@/lib/poker/stats'
import type { PokerSessionRow } from '@/lib/poker/types'

export interface PokerPulse {
  available: boolean
  liveCount: number
  live: { id: string; title: string; playerCount: number; inPlayCents: number; hostName: string | null } | null
  term: { stakedCents: number; sessions: number; leader: { id: string; name: string; netCents: number } | null }
}

export const getPokerPulse = cache(async (supabase: SupabaseClient): Promise<PokerPulse> => {
  const { since } = periodBounds('term')
  const [liveRes, termRes, leaderRes] = await Promise.all([
    supabase
      .from('poker_sessions')
      .select('id, kind, title, stakes, variant, is_official, played_at, scheduled_for, player_count, total_buy_in_cents, host:users!host_id(display_name)', {
        count: 'exact',
      })
      .eq('status', 'live')
      .order('started_at', { ascending: false })
      .limit(1),
    supabase
      .from('poker_sessions')
      .select('total_buy_in_cents')
      .in('status', ['final', 'disputed'])
      .gte('played_at', since ?? '1970-01-01'),
    supabase.rpc('get_poker_leaderboard', {
      p_kind: null,
      p_dorm_id: null,
      p_since: since,
      p_until: null,
      p_sort: 'net',
      p_min_sessions: 1,
      p_limit: 1,
      p_offset: 0,
    }),
  ])
  if (liveRes.error) {
    return { available: false, liveCount: 0, live: null, term: { stakedCents: 0, sessions: 0, leader: null } }
  }
  const liveRow = (liveRes.data ?? [])[0] as unknown as
    | (Pick<PokerSessionRow, 'id' | 'kind' | 'title' | 'stakes' | 'variant' | 'is_official' | 'played_at' | 'scheduled_for' | 'player_count' | 'total_buy_in_cents'> & {
        host: { display_name: string } | null
      })
    | undefined
  const termRows = termRes.data ?? []
  const leader = (leaderRes.data ?? [])[0] as { user_id: string; display_name: string; net_cents: number } | undefined
  return {
    available: true,
    liveCount: liveRes.count ?? (liveRow ? 1 : 0),
    live: liveRow
      ? {
          id: liveRow.id,
          title: sessionTitle(liveRow),
          playerCount: liveRow.player_count,
          inPlayCents: Number(liveRow.total_buy_in_cents),
          hostName: liveRow.host?.display_name ?? null,
        }
      : null,
    term: {
      stakedCents: termRows.reduce((s, r) => s + Number(r.total_buy_in_cents), 0),
      sessions: termRows.length,
      leader: leader ? { id: leader.user_id, name: leader.display_name, netCents: Number(leader.net_cents) } : null,
    },
  }
})

/** The viewer's poker net this term (null when no entries or no migration) */
export const getMyPokerNet = cache(async (supabase: SupabaseClient, userId: string): Promise<number | null> => {
  const { since } = periodBounds('term')
  const { data, error } = await supabase
    .from('poker_counted_entries')
    .select('net_cents')
    .eq('user_id', userId)
    .gte('played_at', since ?? '1970-01-01')
  if (error || !data || data.length === 0) return null
  return data.reduce((s, r) => s + Number(r.net_cents), 0)
})

export type TableGame = 'pool' | 'ping_pong'

export interface TablesPulse {
  /** The viewer's ranked games, if signed in */
  me: { game: TableGame; rank: number; rating: number }[] | null
  leaders: { game: TableGame; name: string; rating: number }[]
}

const GAMES: TableGame[] = ['pool', 'ping_pong']

export const getTablesPulse = cache(async (supabase: SupabaseClient, userId: string | null): Promise<TablesPulse> => {
  const leadersRes = await Promise.all(
    GAMES.map((g) => supabase.rpc('get_leaderboard', { p_game_type: g, p_limit: 1, p_offset: 0, p_dorm_id: null }))
  )
  const leaders = GAMES.flatMap((game, i) => {
    const row = (leadersRes[i].data ?? [])[0] as { display_name: string; rating: number } | undefined
    return row ? [{ game, name: row.display_name, rating: row.rating }] : []
  })

  let me: TablesPulse['me'] = null
  if (userId) {
    const { data: mine } = await supabase.from('elo_ratings').select('game_type, rating, wins, matches_played').eq('user_id', userId)
    const ranked = (mine ?? []).filter((r) => r.matches_played > 0)
    me = await Promise.all(
      ranked.map(async (r) => {
        const [{ count: above }, { count: tied }] = await Promise.all([
          supabase.from('elo_ratings').select('*', { count: 'exact', head: true }).eq('game_type', r.game_type).gt('matches_played', 0).gt('rating', r.rating),
          supabase
            .from('elo_ratings')
            .select('*', { count: 'exact', head: true })
            .eq('game_type', r.game_type)
            .gt('matches_played', 0)
            .eq('rating', r.rating)
            .gt('wins', r.wins),
        ])
        return { game: r.game_type as TableGame, rank: 1 + (above ?? 0) + (tied ?? 0), rating: r.rating }
      })
    )
    me.sort((a, b) => a.rank - b.rank)
  }
  return { me, leaders }
})

export interface MyPokerTerm {
  netCents: number
  sessions: number
  stakedCents: number
}

/** The viewer's poker term in three numbers (null when no entries or no migration) */
export const getMyPokerTerm = cache(async (supabase: SupabaseClient, userId: string): Promise<MyPokerTerm | null> => {
  const { since } = periodBounds('term')
  const { data, error } = await supabase
    .from('poker_counted_entries')
    .select('net_cents, buy_in_cents')
    .eq('user_id', userId)
    .gte('played_at', since ?? '1970-01-01')
  if (error || !data || data.length === 0) return null
  return {
    netCents: data.reduce((s, r) => s + Number(r.net_cents), 0),
    sessions: data.length,
    stakedCents: data.reduce((s, r) => s + Number(r.buy_in_cents), 0),
  }
})

export interface StandingNeighbour {
  id: string
  name: string
  rank: number
  rating: number
  /** Points between this player and the viewer, always positive or zero */
  gap: number
}

export interface GameStanding {
  game: TableGame
  /** False until the viewer has one confirmed match in this game */
  ranked: boolean
  rating: number
  rank: number | null
  /** Ranked players in this game */
  total: number
  played: number
  wins: number
  above: StandingNeighbour | null
  below: StandingNeighbour | null
}

/** Where one player stands in one game, with the players directly above and below */
export const getGameStanding = cache(async (supabase: SupabaseClient, userId: string, game: TableGame): Promise<GameStanding> => {
  const [{ data: mine }, { data: totalRaw }] = await Promise.all([
    supabase.from('elo_ratings').select('rating, wins, matches_played').eq('user_id', userId).eq('game_type', game).maybeSingle(),
    supabase.rpc('get_leaderboard_count', { p_game_type: game, p_dorm_id: null }),
  ])
  const total = Number(totalRaw ?? 0) || 0
  const base = { game, total, played: mine?.matches_played ?? 0, wins: mine?.wins ?? 0, above: null, below: null }
  if (!mine || mine.matches_played === 0) {
    return { ...base, ranked: false, rating: mine?.rating ?? 1500, rank: null }
  }

  const [{ count: higher }, { count: tiedAhead }] = await Promise.all([
    supabase.from('elo_ratings').select('*', { count: 'exact', head: true }).eq('game_type', game).gt('matches_played', 0).gt('rating', mine.rating),
    supabase
      .from('elo_ratings')
      .select('*', { count: 'exact', head: true })
      .eq('game_type', game)
      .gt('matches_played', 0)
      .eq('rating', mine.rating)
      .gt('wins', mine.wins),
  ])
  const rank = 1 + (higher ?? 0) + (tiedAhead ?? 0)

  // The leaderboard RPC is the source of order; read the three rows around the viewer
  const { data: around } = await supabase.rpc('get_leaderboard', {
    p_game_type: game,
    p_limit: 3,
    p_offset: Math.max(0, rank - 2),
    p_dorm_id: null,
  })
  const rows = (around ?? []) as { rank: number; user_id: string; display_name: string; rating: number }[]
  const at = rows.findIndex((r) => r.user_id === userId)
  const pick = (r: (typeof rows)[number] | undefined): StandingNeighbour | null =>
    r && r.user_id !== userId
      ? { id: r.user_id, name: r.display_name, rank: Number(r.rank), rating: r.rating, gap: Math.abs(r.rating - mine.rating) }
      : null
  const above = at >= 0 ? pick(rows[at - 1]) : pick(rows.find((r) => Number(r.rank) === rank - 1))
  const below = at >= 0 ? pick(rows[at + 1]) : pick(rows.find((r) => Number(r.rank) === rank + 1))

  return { ...base, ranked: true, rating: mine.rating, rank: at >= 0 ? Number(rows[at].rank) : rank, above, below }
})
