/** Server-side data loaders shared by the poker pages. */

import type { SupabaseClient } from '@supabase/supabase-js'
import { guestAsPlayer } from './guests'
import type {
  GuestRef,
  PlayerRef,
  PlayerRefWithHouse,
  PokerEntryRow,
  PokerGuestRow,
  PokerSessionRow,
  PokerSponsorRow,
} from './types'

export interface SessionEntryWithUser extends PokerEntryRow {
  /** The player as the UI shows it: the account, or a guest placeholder (`guest: true`) when there is none */
  user: PlayerRefWithHouse | null
  /** Set whenever the row was created for a guest, linked or not */
  guest: GuestRef | null
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
  entries:poker_entries(*, user:users(id, display_name, profile_image_url, dorms(name)), guest:poker_guests(id, name, created_by, linked_user_id)),
  session_sponsors:poker_session_sponsors(position, sponsor:poker_sponsors(*)),
  rsvps:poker_rsvps(created_at, user:users(id, display_name, profile_image_url))
`

type RawUser = {
  id: string
  display_name: string
  profile_image_url: string | null
  dorms?: { name: string } | { name: string }[] | null
}

type RawGuest = {
  id: string
  name: string
  created_by?: string | null
  linked_user_id?: string | null
  creator?: { display_name: string } | { display_name: string }[] | null
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

export function mapGuest(g: RawGuest | null | undefined): GuestRef | null {
  if (!g) return null
  const creator = Array.isArray(g.creator) ? g.creator[0] : g.creator
  return {
    id: g.id,
    name: g.name,
    created_by: g.created_by ?? null,
    added_by: creator?.display_name ?? null,
    linked_user_id: g.linked_user_id ?? null,
  }
}

export async function loadSessionFull(supabase: SupabaseClient, id: string): Promise<SessionFull | null> {
  const { data, error } = await supabase.from('poker_sessions').select(SESSION_FULL_SELECT).eq('id', id).maybeSingle()
  if (error || !data) return null
  const raw = data as unknown as PokerSessionRow & {
    host: RawUser | null
    entries: (PokerEntryRow & { user: RawUser | null; guest: RawGuest | null })[]
    session_sponsors: { position: number; sponsor: PokerSponsorRow | null }[]
    rsvps: { created_at: string; user: RawUser | null }[]
  }
  const { host, entries, session_sponsors, rsvps, ...session } = raw
  return {
    ...session,
    host: mapUser(host),
    entries: (entries ?? [])
      .map(({ user, guest, ...e }) => ({
        ...e,
        user: mapUser(user) ?? (guest ? guestAsPlayer(guest) : null),
        guest: mapGuest(guest),
      }))
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

  // Everyone else at those tables, unlinked guests included (user_id is null for them)
  const { data: others } = await supabase
    .from('poker_entries')
    .select('session_id, user:users(id, display_name, profile_image_url, dorms(name)), guest:poker_guests(id, name, linked_user_id)')
    .in('session_id', sessionIds)
    .or(`user_id.neq.${userId},user_id.is.null`)
  const bySession = new Map<string, PlayerRefWithHouse[]>()
  for (const raw of (others ?? []) as unknown as { session_id: string; user: RawUser | null; guest: RawGuest | null }[]) {
    const u = mapUser(raw.user) ?? (raw.guest && !raw.guest.linked_user_id ? guestAsPlayer(raw.guest) : null)
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

/** Select used by session lists / cards (host + entry avatars) */
export const SESSION_LIST_SELECT = `
  *,
  host:users!host_id(id, display_name, profile_image_url),
  entries:poker_entries(id, user_id, guest_id, buy_in_cents, net_cents, cash_out_cents, acknowledged_at, disputed_at, user:users(id, display_name, profile_image_url), guest:poker_guests(id, name))
`

/** Guests without an account yet, for the player picker (any host can seat any guest) */
export async function loadPickerGuests(supabase: SupabaseClient): Promise<GuestRef[]> {
  const { data } = await supabase
    .from('poker_guests')
    .select('id, name, created_by, linked_user_id, creator:users!created_by(display_name)')
    .is('linked_user_id', null)
    .order('name')
  return (data ?? []).map((g) => mapGuest(g as RawGuest)!).filter(Boolean)
}

/** Guests this host added that still have no account */
export async function loadUnlinkedGuestCount(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count } = await supabase
    .from('poker_guests')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', userId)
    .is('linked_user_id', null)
  return count ?? 0
}

export interface GuestSummary extends PokerGuestRow {
  added_by: PlayerRef | null
  linked_user: PlayerRef | null
  /** Rows on any session, any status (a guest with rows cannot be deleted) */
  entry_count: number
  /** Logged (final/disputed) sessions */
  sessions_played: number
  net_cents: number
  last_played_at: string | null
}

/**
 * Guests for the management page: the ones this host created, or every guest
 * for officers, each with how much ledger history rides on them.
 */
export async function loadGuestSummaries(
  supabase: SupabaseClient,
  userId: string,
  isOfficer: boolean
): Promise<GuestSummary[]> {
  let q = supabase
    .from('poker_guests')
    .select('*, added_by:users!created_by(id, display_name, profile_image_url), linked_user:users!linked_user_id(id, display_name, profile_image_url)')
    .order('created_at', { ascending: false })
  if (!isOfficer) q = q.eq('created_by', userId)
  const { data } = await q
  const rows = (data ?? []) as unknown as (PokerGuestRow & { added_by: RawUser | null; linked_user: RawUser | null })[]
  if (rows.length === 0) return []

  const ids = rows.map((g) => g.id)
  const [{ data: allRows }, { data: counted }] = await Promise.all([
    supabase.from('poker_entries').select('guest_id').in('guest_id', ids).limit(5000),
    supabase.from('poker_counted_entries').select('guest_id, net_cents, played_at').in('guest_id', ids).limit(5000),
  ])
  const entryCount = new Map<string, number>()
  for (const r of (allRows ?? []) as { guest_id: string | null }[]) {
    if (r.guest_id) entryCount.set(r.guest_id, (entryCount.get(r.guest_id) ?? 0) + 1)
  }
  const stats = new Map<string, { sessions: number; net: number; last: string | null }>()
  for (const r of (counted ?? []) as { guest_id: string | null; net_cents: number; played_at: string }[]) {
    if (!r.guest_id) continue
    const cur = stats.get(r.guest_id) ?? { sessions: 0, net: 0, last: null }
    cur.sessions++
    cur.net += r.net_cents
    if (cur.last == null || new Date(r.played_at) > new Date(cur.last)) cur.last = r.played_at
    stats.set(r.guest_id, cur)
  }

  return rows.map(({ added_by, linked_user, ...g }) => {
    const st = stats.get(g.id)
    return {
      ...g,
      added_by: mapUser(added_by),
      linked_user: mapUser(linked_user),
      entry_count: entryCount.get(g.id) ?? 0,
      sessions_played: st?.sessions ?? 0,
      net_cents: st?.net ?? 0,
      last_played_at: st?.last ?? null,
    }
  })
}

/** Counts shown on the Poker tabs: every session on the list, and (signed in) the viewer's guests still without an account */
export async function loadPokerTabCounts(
  supabase: SupabaseClient,
  userId: string | null
): Promise<{ sessions: number | null; guests: number | null }> {
  const [{ count }, guests] = await Promise.all([
    supabase.from('poker_sessions').select('id', { count: 'exact', head: true }),
    userId ? loadUnlinkedGuestCount(supabase, userId) : Promise.resolve(null),
  ])
  return { sessions: count ?? null, guests }
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
