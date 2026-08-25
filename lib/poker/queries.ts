/** Server-side data loaders shared by the poker pages. */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  PlayerRef,
  PlayerRefWithHouse,
  PokerEntryRow,
  PokerSessionRow,
  PokerSponsorRow,
} from './types'

export interface SessionEntryWithUser extends PokerEntryRow {
  user: PlayerRefWithHouse | null
}

export interface SessionFull extends PokerSessionRow {
  host: PlayerRef | null
  entries: SessionEntryWithUser[]
  sponsors: PokerSponsorRow[]
  rsvps: { user: PlayerRef | null; created_at: string }[]
}

const SESSION_FULL_SELECT = `
  *,
  host:users!host_id(id, display_name, profile_image_url),
  entries:poker_entries(*, user:users(id, display_name, profile_image_url, dorms(name))),
  session_sponsors:poker_session_sponsors(position, sponsor:poker_sponsors(*)),
  rsvps:poker_rsvps(created_at, user:users(id, display_name, profile_image_url))
`

type RawUser = {
  id: string
  display_name: string
  profile_image_url: string | null
  dorms?: { name: string } | { name: string }[] | null
}

export function mapUser(u: RawUser | null | undefined): PlayerRefWithHouse | null {
  if (!u) return null
  const dorm = Array.isArray(u.dorms) ? u.dorms[0] : u.dorms
  return {
    id: u.id,
    display_name: u.display_name,
    profile_image_url: u.profile_image_url ?? null,
    dorm_name: dorm?.name ?? null,
  }
}

export async function loadSessionFull(supabase: SupabaseClient, id: string): Promise<SessionFull | null> {
  const { data, error } = await supabase.from('poker_sessions').select(SESSION_FULL_SELECT).eq('id', id).maybeSingle()
  if (error || !data) return null
  const raw = data as unknown as PokerSessionRow & {
    host: RawUser | null
    entries: (PokerEntryRow & { user: RawUser | null })[]
    session_sponsors: { position: number; sponsor: PokerSponsorRow | null }[]
    rsvps: { created_at: string; user: RawUser | null }[]
  }
  const { host, entries, session_sponsors, rsvps, ...session } = raw
  return {
    ...session,
    host: mapUser(host),
    entries: (entries ?? [])
      .map((e) => ({ ...e, user: mapUser(e.user) }))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    sponsors: (session_sponsors ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((s) => s.sponsor)
      .filter((s): s is PokerSponsorRow => s != null),
    rsvps: (rsvps ?? []).map((r) => ({ created_at: r.created_at, user: mapUser(r.user) })),
  }
}

/** Every registered user, for the player picker */
export async function loadPickerPlayers(supabase: SupabaseClient): Promise<PlayerRefWithHouse[]> {
  const { data } = await supabase
    .from('users')
    .select('id, display_name, profile_image_url, dorms(name)')
    .order('display_name')
  return (data ?? []).map((u) => mapUser(u as RawUser)!).filter(Boolean)
}

/** People the user has shared a table with most recently (up to `limit`) */
export async function loadRecentTablemates(
  supabase: SupabaseClient,
  userId: string,
  limit = 8
): Promise<PlayerRefWithHouse[]> {
  const { data: mine } = await supabase
    .from('poker_entries')
    .select('session_id, session:poker_sessions!inner(played_at, status)')
    .eq('user_id', userId)
    .neq('session.status', 'voided')
    .order('created_at', { ascending: false })
    .limit(15)
  const rows = (mine ?? []) as unknown as { session_id: string; session: { played_at: string } | null }[]
  const sessionIds = rows
    .slice()
    .sort((a, b) => new Date(b.session?.played_at ?? 0).getTime() - new Date(a.session?.played_at ?? 0).getTime())
    .map((r) => r.session_id)
  if (sessionIds.length === 0) return []

  const { data: others } = await supabase
    .from('poker_entries')
    .select('session_id, user:users(id, display_name, profile_image_url, dorms(name))')
    .in('session_id', sessionIds)
    .neq('user_id', userId)
  const bySession = new Map<string, PlayerRefWithHouse[]>()
  for (const raw of (others ?? []) as unknown as { session_id: string; user: RawUser | null }[]) {
    const u = mapUser(raw.user)
    if (!u) continue
    const list = bySession.get(raw.session_id) ?? []
    list.push(u)
    bySession.set(raw.session_id, list)
  }
  const seen = new Set<string>()
  const out: PlayerRefWithHouse[] = []
  for (const sid of sessionIds) {
    for (const u of bySession.get(sid) ?? []) {
      if (seen.has(u.id)) continue
      seen.add(u.id)
      out.push(u)
      if (out.length >= limit) return out
    }
  }
  return out
}

/** The user's current live session, if any (at most one by DB constraint) */
export async function loadLiveSessionFor(
  supabase: SupabaseClient,
  userId: string
): Promise<PokerSessionRow | null> {
  const { data } = await supabase
    .from('poker_sessions')
    .select('*')
    .eq('host_id', userId)
    .eq('status', 'live')
    .maybeSingle()
  return (data as PokerSessionRow | null) ?? null
}

export async function loadIsOfficer(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase.from('users').select('poker_officer').eq('id', userId).maybeSingle()
  return Boolean(data?.poker_officer)
}

export async function loadSponsors(supabase: SupabaseClient): Promise<PokerSponsorRow[]> {
  const { data } = await supabase.from('poker_sponsors').select('*').order('name')
  return (data ?? []) as PokerSponsorRow[]
}

export async function loadHouseNames(supabase: SupabaseClient): Promise<string[]> {
  const { data } = await supabase.from('dorms').select('name').order('name')
  return (data ?? []).map((d) => d.name as string)
}
