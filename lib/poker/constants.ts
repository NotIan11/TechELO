/** Shared limits — keep in sync with the CHECK constraints in migration 013 */
export const MAX_ENTRY_AMOUNT_CENTS = 10_000_000 // $100,000
export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 100
export const MAX_REBUYS = 100
export const MAX_DURATION_MINUTES = 4320 // 72h
export const MAX_REASON_LENGTH = 500
export const MAX_TITLE_LENGTH = 80
export const MAX_LOCATION_LENGTH = 80
export const MAX_NOTES_LENGTH = 1000
export const MAX_STAKES_LENGTH = 30
export const MAX_VARIANT_LENGTH = 30
/** Sessions may be stamped up to this far in the future (clock skew) */
export const FUTURE_SLACK_MS = 60 * 60 * 1000
export const MIN_PLAYED_AT = '2015-01-01T00:00:00.000Z'

/** Minimum sessions before ROI-based rankings/awards apply */
export const SHARK_MIN_SESSIONS = 5

export const PAGE_SIZE = 25

export const STAKES_PRESETS = ['$0.10/$0.20', '$0.25/$0.50', '$0.50/$1', '$1/$2'] as const

export const VARIANT_OPTIONS = ['NLHE', 'PLO', 'Mixed', 'Other'] as const

/** Quick "+ buy-in" amounts offered when starting a cash game */
export const BUY_IN_PRESETS_CENTS = [1000, 2000, 2500, 5000, 10000] as const

/** Entry-fee presets for regular (non-official) tournaments */
export const ENTRY_FEE_PRESETS_CENTS = [500, 1000, 2000, 5000] as const

export const DURATION_PRESETS_MINUTES = [60, 120, 180, 240, 360] as const

export const PERIOD_OPTIONS: { value: 'term' | '30d' | 'year' | 'all'; label: string }[] = [
  { value: 'term', label: 'This term' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'year', label: 'This year' },
  { value: 'all', label: 'All-time' },
]

export const KIND_OPTIONS: { value: 'all' | 'cash' | 'tournament'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'cash', label: 'Cash' },
  { value: 'tournament', label: 'Tournaments' },
]

export const SORT_OPTIONS: { value: 'net' | 'roi' | 'staked' | 'sessions'; label: string }[] = [
  { value: 'net', label: 'Net' },
  { value: 'roi', label: 'ROI' },
  { value: 'staked', label: 'Staked' },
  { value: 'sessions', label: 'Sessions' },
]
