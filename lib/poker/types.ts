/**
 * Poker domain types. Rows mirror migration 013; payloads mirror the API routes.
 * Money is always integer cents.
 */

export type PokerSessionKind = 'cash' | 'tournament'
export type PokerSessionStatus = 'scheduled' | 'live' | 'final' | 'disputed' | 'voided'
export type PokerKindFilter = 'all' | 'cash' | 'tournament'
export type PokerPeriod = 'term' | '30d' | 'year' | 'all'
export type PokerSort = 'net' | 'roi' | 'staked' | 'sessions' | 'hourly' | 'biggest_win'

export interface PlayerRef {
  id: string
  display_name: string
  profile_image_url: string | null
}

export interface PlayerRefWithHouse extends PlayerRef {
  dorm_name?: string | null
}

/** `poker_sessions` row */
export interface PokerSessionRow {
  id: string
  kind: PokerSessionKind
  host_id: string
  title: string | null
  location: string | null
  notes: string | null
  stakes: string | null
  variant: string | null
  is_official: boolean
  scheduled_for: string | null
  started_at: string | null
  ended_at: string | null
  played_at: string
  duration_minutes: number | null
  standard_buy_in_cents: number | null
  prize_pool_cents: number | null
  status: PokerSessionStatus
  version: number
  player_count: number
  ack_count: number
  dispute_count: number
  total_buy_in_cents: number
  total_cash_out_cents: number
  discrepancy_cents: number
  rsvp_count: number
  created_at: string
  updated_at: string
  finalized_at: string | null
  voided_at: string | null
}

/** `poker_entries` row */
export interface PokerEntryRow {
  id: string
  session_id: string
  user_id: string
  buy_in_cents: number
  /** null while a live cash session hasn't recorded the cash-out yet */
  cash_out_cents: number | null
  rebuy_count: number
  net_cents: number
  finish_place: number | null
  acknowledged_at: string | null
  disputed_at: string | null
  dispute_reason: string | null
  created_at: string
}

/** `poker_sponsors` row */
export interface PokerSponsorRow {
  id: string
  name: string
  logo_url: string | null
  website_url: string | null
  created_by: string | null
  created_at: string
}

/** `poker_rsvps` row */
export interface PokerRsvpRow {
  session_id: string
  user_id: string
  created_at: string
}

/** `poker_counted_entries` view row: an entry joined to its (counting) session */
export interface PokerCountedEntry {
  id: string
  session_id: string
  user_id: string
  buy_in_cents: number
  cash_out_cents: number | null
  rebuy_count: number
  net_cents: number
  finish_place: number | null
  acknowledged_at: string | null
  disputed_at: string | null
  kind: PokerSessionKind
  status: PokerSessionStatus
  played_at: string
  duration_minutes: number | null
  player_count: number
  host_id: string
  title: string | null
  stakes: string | null
  variant: string | null
  is_official: boolean
}

/** One row of `get_poker_leaderboard` */
export interface PokerLeaderboardRow {
  rank: number
  user_id: string
  display_name: string
  profile_image_url: string | null
  dorm_name: string | null
  sessions_played: number
  winning_sessions: number
  net_cents: number
  staked_cents: number
  cashed_out_cents: number
  roi_pct: number | null
  biggest_win_cents: number
  biggest_loss_cents: number
  avg_buy_in_cents: number
  avg_net_cents: number
  hours_played: number | null
  hourly_cents: number | null
  tournament_entries: number
  tournament_cashes: number
  first_places: number
  best_finish: number | null
  last_played_at: string | null
}

export interface PokerEntryInput {
  user_id: string
  buy_in_cents: number
  cash_out_cents: number | null
  rebuy_count: number
  finish_place: number | null
}

/** Body of POST /api/poker/sessions/start */
export interface StartSessionPayload {
  kind: PokerSessionKind
  stakes?: string | null
  variant?: string | null
  location?: string | null
  title?: string | null
  standard_buy_in_cents?: number | null
  /** Backdating: start a session that already happened */
  played_at?: string | null
  is_official?: boolean
  scheduled_for?: string | null
  sponsor_ids?: string[]
}

/** Body of POST /api/poker/sessions/{save,finalize,update} */
export interface SaveSessionPayload {
  session_id: string
  version: number
  title?: string | null
  stakes?: string | null
  variant?: string | null
  location?: string | null
  notes?: string | null
  standard_buy_in_cents?: number | null
  prize_pool_cents?: number | null
  played_at?: string | null
  scheduled_for?: string | null
  duration_minutes?: number | null
  sponsor_ids?: string[]
  entries: PokerEntryInput[]
}

export interface Award {
  key: string
  title: string
  blurb: string
  /** Emoji-free icon key handled by the AwardCard */
  icon: 'whale' | 'shark' | 'grinder' | 'heater' | 'night' | 'reload' | 'bubble' | 'champ' | 'generous'
  holder: PlayerRef | null
  /** For session-linked awards (Biggest Night) */
  sessionId?: string
  sessionTitle?: string
  valueLabel: string
}
