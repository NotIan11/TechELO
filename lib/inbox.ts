/**
 * Inbox derivation shared by /inbox and /api/inbox/count. Nothing is stored:
 * "pending items" are computed from match and poker rows each time.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { isChallengeExpired } from '@/lib/utils'
import type { PokerSessionKind, PokerSessionStatus } from '@/lib/poker/types'

export interface InboxPlayer {
  id: string
  display_name: string
  profile_image_url: string | null
}

export interface InboxMatch {
  id: string
  game_type: string
  status: string
  player1_id: string
  player2_id: string
  winner_id: string | null
  player1_start_accepted: boolean
  player2_start_accepted: boolean
  player1_result_accepted: boolean
  player2_result_accepted: boolean
  created_at: string
  started_at: string | null
  completed_at: string | null
  player1: InboxPlayer | null
  player2: InboxPlayer | null
}

export interface InboxPokerSession {
  id: string
  kind: PokerSessionKind
  title: string | null
  stakes: string | null
  variant: string | null
  is_official: boolean
  played_at: string
  status: PokerSessionStatus
  player_count: number
  host_id: string
  host: InboxPlayer | null
}

export type InboxItem =
  | { kind: 'match'; id: string; sortAt: string; match: InboxMatch; action: 'accept_start' | 'report_result' }
  | {
      kind: 'poker_ack'
      id: string
      sortAt: string
      session: InboxPokerSession
      entry: {
        id: string
        buy_in_cents: number
        cash_out_cents: number | null
        net_cents: number
        finish_place: number | null
      }
    }
  | {
      kind: 'poker_dispute'
      id: string
      sortAt: string
      session: Omit<InboxPokerSession, 'host'>
      disputes: { entry_id: string; reason: string; disputed_at: string; user: InboxPlayer | null }[]
    }

const MATCH_SELECT = `
  *,
  player1:users!player1_id(id, display_name, profile_image_url),
  player2:users!player2_id(id, display_name, profile_image_url)
`

const POKER_ACK_SELECT = `
  id, session_id, buy_in_cents, cash_out_cents, net_cents, finish_place, created_at,
  session:poker_sessions!inner(
    id, kind, title, stakes, variant, is_official, played_at, status, player_count, host_id,
    host:users!host_id(id, display_name, profile_image_url)
  )
`

const POKER_DISPUTE_SELECT = `
  id, kind, title, stakes, variant, is_official, played_at, status, player_count, host_id, updated_at,
  entries:poker_entries(id, dispute_reason, disputed_at, user:users(id, display_name, profile_image_url))
`

export async function getInboxItems(supabase: SupabaseClient, userId: string): Promise<InboxItem[]> {
  const [matchesRes, acksRes, disputesRes] = await Promise.all([
    supabase
      .from('matches')
      .select(MATCH_SELECT)
      .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
      .in('status', ['pending_start', 'in_progress', 'pending_result'])
      .order('created_at', { ascending: false }),
    supabase
      .from('poker_entries')
      .select(POKER_ACK_SELECT)
      .eq('user_id', userId)
      .is('acknowledged_at', null)
      .is('disputed_at', null)
      .in('session.status', ['final', 'disputed'])
      .order('created_at', { ascending: false }),
    supabase
      .from('poker_sessions')
      .select(POKER_DISPUTE_SELECT)
      .eq('host_id', userId)
      .eq('status', 'disputed')
      .order('updated_at', { ascending: false }),
  ])

  const items: InboxItem[] = []

  for (const raw of matchesRes.data ?? []) {
    const match = raw as unknown as InboxMatch
    const isPlayer1 = match.player1_id === userId
    const isPlayer2 = match.player2_id === userId
    if (
      match.status === 'pending_start' &&
      isPlayer2 &&
      !match.player2_start_accepted &&
      !isChallengeExpired(match.created_at)
    ) {
      items.push({ kind: 'match', id: `match:${match.id}`, sortAt: match.created_at, match, action: 'accept_start' })
    } else if (
      (match.status === 'in_progress' || match.status === 'pending_result') &&
      ((isPlayer1 && !match.player1_result_accepted) || (isPlayer2 && !match.player2_result_accepted))
    ) {
      items.push({ kind: 'match', id: `match:${match.id}`, sortAt: match.created_at, match, action: 'report_result' })
    }
  }

  for (const raw of acksRes.data ?? []) {
    const row = raw as unknown as {
      id: string
      buy_in_cents: number
      cash_out_cents: number | null
      net_cents: number
      finish_place: number | null
      created_at: string
      session: InboxPokerSession | null
    }
    if (!row.session || (row.session.status !== 'final' && row.session.status !== 'disputed')) continue
    items.push({
      kind: 'poker_ack',
      id: `ack:${row.id}`,
      sortAt: row.created_at,
      session: row.session,
      entry: {
        id: row.id,
        buy_in_cents: row.buy_in_cents,
        cash_out_cents: row.cash_out_cents,
        net_cents: row.net_cents,
        finish_place: row.finish_place,
      },
    })
  }

  for (const raw of disputesRes.data ?? []) {
    const s = raw as unknown as Omit<InboxPokerSession, 'host'> & {
      updated_at: string
      entries: { id: string; dispute_reason: string | null; disputed_at: string | null; user: InboxPlayer | null }[]
    }
    const disputes = (s.entries ?? [])
      .filter((e) => e.disputed_at != null)
      .map((e) => ({ entry_id: e.id, reason: e.dispute_reason ?? '', disputed_at: e.disputed_at!, user: e.user }))
    if (disputes.length === 0) continue
    const { entries: _entries, updated_at, ...session } = s
    void _entries
    items.push({ kind: 'poker_dispute', id: `dispute:${s.id}`, sortAt: updated_at, session, disputes })
  }

  items.sort((a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime())
  return items
}

export async function getInboxCount(supabase: SupabaseClient, userId: string): Promise<number> {
  return (await getInboxItems(supabase, userId)).length
}
