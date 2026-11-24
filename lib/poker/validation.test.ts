import { describe, expect, it } from 'vitest'
import { MAX_ENTRY_AMOUNT_CENTS, MAX_GUEST_NAME_LENGTH, MAX_PLAYERS, MAX_REASON_LENGTH, MAX_REBUYS } from './constants'
import {
  isUuid,
  validateDisputeReason,
  validateGuestName,
  validateKind,
  validateSavePayload,
  validateStartPayload,
} from './validation'

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const SESSION = uuid(999)

function errorOf(result: { ok: true } | { ok: false; error: string }): string | null {
  return result.ok ? null : result.error
}

describe('validateKind / isUuid', () => {
  it('accepts only the two session kinds', () => {
    expect(validateKind('cash')).toBe('cash')
    expect(validateKind('tournament')).toBe('tournament')
    expect(validateKind('sit-n-go')).toBeNull()
    expect(validateKind(undefined)).toBeNull()
  })

  it('recognises UUIDs', () => {
    expect(isUuid(uuid(1))).toBe(true)
    expect(isUuid(uuid(1).toUpperCase())).toBe(true)
    expect(isUuid('not-a-uuid')).toBe(false)
    expect(isUuid(`${uuid(1)}; drop table`)).toBe(false)
    expect(isUuid(42)).toBe(false)
  })
})

describe('validateStartPayload', () => {
  it('normalises a minimal cash game', () => {
    const r = validateStartPayload({ kind: 'cash' })
    expect(r).toEqual({
      ok: true,
      payload: {
        kind: 'cash',
        stakes: null,
        variant: null,
        location: null,
        title: null,
        standard_buy_in_cents: null,
        played_at: null,
        is_official: false,
        scheduled_for: null,
        sponsor_ids: [],
      },
    })
  })

  it('trims text, blanks empty strings and de-duplicates sponsors', () => {
    const r = validateStartPayload({
      kind: 'tournament',
      title: '  Fall Classic  ',
      location: '   ',
      standard_buy_in_cents: 2000,
      is_official: true,
      sponsor_ids: [uuid(1), uuid(2), uuid(1)],
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.payload.title).toBe('Fall Classic')
    expect(r.payload.location).toBeNull()
    expect(r.payload.standard_buy_in_cents).toBe(2000)
    expect(r.payload.sponsor_ids).toEqual([uuid(1), uuid(2)])
  })

  it('rejects non-objects and unknown kinds', () => {
    expect(errorOf(validateStartPayload(null))).toBe('Invalid request body.')
    expect(errorOf(validateStartPayload([]))).toBe('Invalid request body.')
    expect(errorOf(validateStartPayload({ kind: 'bingo' }))).toBe('Session type must be cash or tournament.')
  })

  it('only lets tournaments be official', () => {
    expect(errorOf(validateStartPayload({ kind: 'cash', is_official: true }))).toBe('Only tournaments can be official.')
    expect(validateStartPayload({ kind: 'tournament', is_official: true }).ok).toBe(true)
  })

  it('only treats a literal true as official', () => {
    const r = validateStartPayload({ kind: 'tournament', is_official: 'true' })
    expect(r.ok && r.payload.is_official).toBe(false)
  })

  it('only lets official tournaments be scheduled ahead', () => {
    const future = new Date(Date.now() + 7 * 86_400_000).toISOString()
    expect(errorOf(validateStartPayload({ kind: 'tournament', scheduled_for: future }))).toBe(
      'Only official tournaments can be scheduled ahead of time.'
    )
    const ok = validateStartPayload({ kind: 'tournament', is_official: true, scheduled_for: future })
    expect(ok.ok && ok.payload.scheduled_for).toBe(future)
  })

  it('rejects a played_at in the future but allows backdating', () => {
    const future = new Date(Date.now() + 2 * 86_400_000).toISOString()
    expect(errorOf(validateStartPayload({ kind: 'cash', played_at: future }))).toBe("Session date can't be in the future.")
    const past = validateStartPayload({ kind: 'cash', played_at: '2026-01-10T04:00:00Z' })
    expect(past.ok && past.payload.played_at).toBe('2026-01-10T04:00:00.000Z')
  })

  it('rejects absurd or unparseable dates', () => {
    expect(errorOf(validateStartPayload({ kind: 'cash', played_at: '1999-01-01T00:00:00Z' }))).toBe(
      'Session date is too far in the past.'
    )
    expect(errorOf(validateStartPayload({ kind: 'cash', played_at: 'last tuesday' }))).toBe('Session date is not a valid date.')
  })

  it('rejects over-long text and bad sponsor lists', () => {
    expect(errorOf(validateStartPayload({ kind: 'cash', title: 'x'.repeat(81) }))).toBe('Title must be 80 characters or fewer.')
    expect(errorOf(validateStartPayload({ kind: 'cash', stakes: 5 }))).toBe('Stakes must be text.')
    expect(errorOf(validateStartPayload({ kind: 'cash', sponsor_ids: ['nope'] }))).toBe('Sponsor list is invalid.')
    expect(errorOf(validateStartPayload({ kind: 'cash', sponsor_ids: uuid(1) }))).toBe('Sponsor list is invalid.')
  })
})

describe('validateSavePayload', () => {
  const row = (n: number, over: Record<string, unknown> = {}) => ({
    user_id: uuid(n),
    buy_in_cents: 2000,
    cash_out_cents: 2000,
    ...over,
  })
  const body = (entries: unknown[], over: Record<string, unknown> = {}) => ({
    session_id: SESSION,
    version: 1,
    entries,
    ...over,
  })
  const lax = (b: unknown, kind: 'cash' | 'tournament' = 'cash') => validateSavePayload(b, kind, { strict: false })
  const strict = (b: unknown, kind: 'cash' | 'tournament' = 'cash') => validateSavePayload(b, kind, { strict: true })

  describe('envelope', () => {
    it('requires a session id, a version and an entries array', () => {
      expect(errorOf(lax('nope'))).toBe('Invalid request body.')
      expect(errorOf(lax({ version: 1, entries: [] }))).toBe('Missing session id.')
      expect(errorOf(lax({ session_id: 'abc', version: 1, entries: [] }))).toBe('Missing session id.')
      expect(errorOf(lax({ session_id: SESSION, entries: [] }))).toBe('Missing session version.')
      expect(errorOf(lax({ session_id: SESSION, version: 0, entries: [] }))).toBe('Missing session version.')
      expect(errorOf(lax({ session_id: SESSION, version: 1.5, entries: [] }))).toBe('Missing session version.')
      expect(errorOf(lax({ session_id: SESSION, version: 1 }))).toBe('Ledger rows are missing.')
    })

    it('accepts an empty ledger while the session is live', () => {
      expect(lax(body([])).ok).toBe(true)
    })

    it('caps the number of players', () => {
      const tooMany = Array.from({ length: MAX_PLAYERS + 1 }, (_, i) => row(i))
      expect(errorOf(lax(body(tooMany)))).toBe(`A session can have at most ${MAX_PLAYERS} players.`)
      expect(lax(body(tooMany.slice(0, MAX_PLAYERS))).ok).toBe(true)
    })

    it('bounds the duration', () => {
      const msg = 'Duration must be between 1 minute and 72 hours.'
      expect(errorOf(lax(body([], { duration_minutes: 0 })))).toBe(msg)
      expect(errorOf(lax(body([], { duration_minutes: 4321 })))).toBe(msg)
      expect(errorOf(lax(body([], { duration_minutes: 90.5 })))).toBe(msg)
      const ok = lax(body([], { duration_minutes: 4320 }))
      expect(ok.ok && ok.payload.duration_minutes).toBe(4320)
    })

    it('only allows a prize pool on tournaments', () => {
      expect(errorOf(lax(body([], { prize_pool_cents: 10000 }), 'cash'))).toBe('Prize pool only applies to tournaments.')
      const ok = lax(body([], { prize_pool_cents: 10000 }), 'tournament')
      expect(ok.ok && ok.payload.prize_pool_cents).toBe(10000)
    })
  })

  describe('rows', () => {
    it('fills in defaults', () => {
      const r = lax(body([{ user_id: uuid(1) }]))
      expect(r.ok && r.payload.entries).toEqual([
        { user_id: uuid(1), guest_id: null, buy_in_cents: 0, cash_out_cents: null, rebuy_count: 0, finish_place: null },
      ])
    })

    it('needs a player or a guest on every row', () => {
      expect(errorOf(lax(body([{ buy_in_cents: 2000 }])))).toBe('Row 1 needs a player.')
      expect(errorOf(lax(body([row(1), { user_id: 'bob' }])))).toBe('Row 2 has an invalid player.')
      expect(errorOf(lax(body([{ guest_id: 'someone' }])))).toBe('Row 1 has an invalid guest.')
      expect(errorOf(lax(body(['row'])))).toBe('Row 1 is malformed.')
    })

    it('accepts guest rows', () => {
      const r = lax(body([{ guest_id: uuid(50), buy_in_cents: 2000 }]))
      expect(r.ok && r.payload.entries[0]).toMatchObject({ user_id: null, guest_id: uuid(50) })
    })

    it('only accepts whole, non-negative cents within the cap', () => {
      expect(errorOf(lax(body([row(1, { buy_in_cents: 20.5 })])))).toBe('Row 1 buy-in must be whole cents.')
      expect(errorOf(lax(body([row(1, { buy_in_cents: '2000' })])))).toBe('Row 1 buy-in must be whole cents.')
      expect(errorOf(lax(body([row(1, { cash_out_cents: -1 })])))).toBe('Row 1 cash-out must be between $0 and $100,000.')
      expect(errorOf(lax(body([row(1, { buy_in_cents: MAX_ENTRY_AMOUNT_CENTS + 1 })])))).toBe(
        'Row 1 buy-in must be between $0 and $100,000.'
      )
      expect(lax(body([row(1, { buy_in_cents: MAX_ENTRY_AMOUNT_CENTS })])).ok).toBe(true)
    })

    it('keeps a zero cash-out distinct from a missing one', () => {
      const r = lax(body([row(1, { cash_out_cents: 0 }), row(2, { cash_out_cents: null })]))
      expect(r.ok && r.payload.entries.map((e) => e.cash_out_cents)).toEqual([0, null])
    })

    it('bounds rebuys', () => {
      expect(errorOf(lax(body([row(1, { rebuy_count: 1.5 })])))).toBe('Row 1 rebuys must be a whole number.')
      expect(errorOf(lax(body([row(1, { rebuy_count: -1 })])))).toBe(`Row 1 rebuys must be between 0 and ${MAX_REBUYS}.`)
      expect(errorOf(lax(body([row(1, { rebuy_count: MAX_REBUYS + 1 })])))).toBe(
        `Row 1 rebuys must be between 0 and ${MAX_REBUYS}.`
      )
    })

    it('rejects the same player or guest twice', () => {
      expect(errorOf(lax(body([row(1), row(1)])))).toBe('Each player can only appear once per session.')
      expect(errorOf(lax(body([{ guest_id: uuid(50) }, { guest_id: uuid(50) }])))).toBe(
        'Each guest can only appear once per session.'
      )
    })

    it('only allows finishing places in tournaments', () => {
      expect(errorOf(lax(body([row(1, { finish_place: 1 })]), 'cash'))).toBe('Finishing places only apply to tournaments.')
      expect(errorOf(lax(body([row(1, { finish_place: 0 })]), 'tournament'))).toBe('Row 1 finishing place is invalid.')
      expect(lax(body([row(1, { finish_place: 1 })]), 'tournament').ok).toBe(true)
    })
  })

  describe('finalising a cash game', () => {
    it('accepts a complete ledger', () => {
      expect(strict(body([row(1, { cash_out_cents: 3500 }), row(2, { cash_out_cents: 500 })])).ok).toBe(true)
    })

    it('needs at least two players', () => {
      expect(errorOf(strict(body([row(1)])))).toBe('A session needs at least 2 players.')
    })

    it('needs a cash-out on every row, but zero counts', () => {
      expect(errorOf(strict(body([row(1), row(2, { cash_out_cents: null })])))).toMatch(/Every player needs a cash-out/)
      expect(strict(body([row(1, { cash_out_cents: 4000 }), row(2, { cash_out_cents: 0 })])).ok).toBe(true)
    })

    it('needs some money on the table', () => {
      const broke = [row(1, { buy_in_cents: 0, cash_out_cents: 0 }), row(2, { buy_in_cents: 0, cash_out_cents: 0 })]
      expect(errorOf(strict(body(broke)))).toBe('A cash session needs at least one buy-in.')
    })

    it('does not apply those rules to a draft save', () => {
      expect(lax(body([row(1, { cash_out_cents: null })])).ok).toBe(true)
    })
  })

  describe('finalising a tournament', () => {
    const t = (n: number, place: number | null, cashOut: number | null = 0) =>
      row(n, { buy_in_cents: 1000, cash_out_cents: cashOut, finish_place: place })

    it('accepts places with payouts, and unplaced players without', () => {
      expect(strict(body([t(1, 1, 2000), t(2, 2, 1000), t(3, null, null)]), 'tournament').ok).toBe(true)
    })

    it('rejects a place beyond the field size', () => {
      expect(errorOf(strict(body([t(1, 1), t(2, 3)]), 'tournament'))).toBe(
        'Finishing places must be between 1 and the number of players.'
      )
    })

    it('rejects shared places', () => {
      expect(errorOf(strict(body([t(1, 1), t(2, 1)]), 'tournament'))).toBe('Two players cannot share a finishing place.')
    })

    it('requires a place for anyone who was paid', () => {
      expect(errorOf(strict(body([t(1, 1, 2000), t(2, null, 1000)]), 'tournament'))).toBe(
        'A player with a payout needs a finishing place.'
      )
    })

    it('still needs two players', () => {
      expect(errorOf(strict(body([t(1, 1, 1000)]), 'tournament'))).toBe('A session needs at least 2 players.')
    })
  })
})

describe('validateDisputeReason', () => {
  it('trims and accepts a reason', () => {
    expect(validateDisputeReason('  I cashed out $40, not $30  ')).toEqual({ ok: true, payload: 'I cashed out $40, not $30' })
  })

  it('rejects empty, non-text and over-long reasons', () => {
    expect(validateDisputeReason('   ').ok).toBe(false)
    expect(validateDisputeReason(undefined).ok).toBe(false)
    expect(validateDisputeReason('x'.repeat(MAX_REASON_LENGTH)).ok).toBe(true)
    expect(validateDisputeReason('x'.repeat(MAX_REASON_LENGTH + 1)).ok).toBe(false)
  })
})

describe('validateGuestName', () => {
  it('trims and collapses whitespace', () => {
    expect(validateGuestName('  Sam   from\tLloyd ')).toEqual({ ok: true, payload: 'Sam from Lloyd' })
  })

  it('rejects empty, non-text and over-long names', () => {
    expect(validateGuestName('').ok).toBe(false)
    expect(validateGuestName('   ').ok).toBe(false)
    expect(validateGuestName(null).ok).toBe(false)
    expect(validateGuestName('x'.repeat(MAX_GUEST_NAME_LENGTH)).ok).toBe(true)
    expect(validateGuestName('x'.repeat(MAX_GUEST_NAME_LENGTH + 1)).ok).toBe(false)
  })
})
