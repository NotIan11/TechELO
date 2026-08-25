/**
 * Small, cached loaders behind the cross-promotion panels (the "try the other
 * game" nudges). Every loader tolerates a database without migration 013.
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
