import {
  FUTURE_SLACK_MS,
  MAX_DURATION_MINUTES,
  MAX_ENTRY_AMOUNT_CENTS,
  MAX_LOCATION_LENGTH,
  MAX_NOTES_LENGTH,
  MAX_PLAYERS,
  MAX_REASON_LENGTH,
  MAX_REBUYS,
  MAX_STAKES_LENGTH,
  MAX_TITLE_LENGTH,
  MAX_VARIANT_LENGTH,
  MIN_PLAYED_AT,
  MIN_PLAYERS,
} from './constants'
import type { PokerEntryInput, PokerSessionKind, SaveSessionPayload, StartSessionPayload } from './types'

type Ok<T> = { ok: true; payload: T }
type Fail = { ok: false; error: string }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function optionalText(v: unknown, max: number, field: string): string | null | Fail {
  if (v == null) return null
  if (typeof v !== 'string') return { ok: false, error: `${field} must be text.` }
  const t = v.trim()
  if (t === '') return null
  if (t.length > max) return { ok: false, error: `${field} must be ${max} characters or fewer.` }
  return t
}

function isFail(v: unknown): v is Fail {
  return isRecord(v) && v.ok === false
}

function optionalCents(v: unknown, field: string): number | null | Fail {
  if (v == null || v === '') return null
  if (typeof v !== 'number' || !Number.isInteger(v)) return { ok: false, error: `${field} must be whole cents.` }
  if (v < 0 || v > MAX_ENTRY_AMOUNT_CENTS) return { ok: false, error: `${field} must be between $0 and $100,000.` }
  return v
}

function optionalIsoDate(
  v: unknown,
  field: string,
  opts: { allowFuture: boolean }
): string | null | Fail {
  if (v == null || v === '') return null
  if (typeof v !== 'string') return { ok: false, error: `${field} must be a date.` }
  const t = Date.parse(v)
  if (Number.isNaN(t)) return { ok: false, error: `${field} is not a valid date.` }
  if (t < Date.parse(MIN_PLAYED_AT)) return { ok: false, error: `${field} is too far in the past.` }
  if (!opts.allowFuture && t > Date.now() + FUTURE_SLACK_MS) {
    return { ok: false, error: `${field} can't be in the future.` }
  }
  return new Date(t).toISOString()
}

function sponsorIds(v: unknown): string[] | Fail {
  if (v == null) return []
  if (!Array.isArray(v) || v.some((id) => typeof id !== 'string' || !UUID_RE.test(id))) {
    return { ok: false, error: 'Sponsor list is invalid.' }
  }
  return Array.from(new Set(v as string[]))
}

export function validateKind(v: unknown): PokerSessionKind | null {
  return v === 'cash' || v === 'tournament' ? v : null
}

export function validateStartPayload(body: unknown): Ok<StartSessionPayload> | Fail {
  if (!isRecord(body)) return { ok: false, error: 'Invalid request body.' }
  const kind = validateKind(body.kind)
  if (!kind) return { ok: false, error: 'Session type must be cash or tournament.' }

  const stakes = optionalText(body.stakes, MAX_STAKES_LENGTH, 'Stakes')
  if (isFail(stakes)) return stakes
  const variant = optionalText(body.variant, MAX_VARIANT_LENGTH, 'Variant')
  if (isFail(variant)) return variant
  const location = optionalText(body.location, MAX_LOCATION_LENGTH, 'Location')
  if (isFail(location)) return location
  const title = optionalText(body.title, MAX_TITLE_LENGTH, 'Title')
  if (isFail(title)) return title
  const standardBuyIn = optionalCents(body.standard_buy_in_cents, 'Buy-in')
  if (isFail(standardBuyIn)) return standardBuyIn
  const playedAt = optionalIsoDate(body.played_at, 'Session date', { allowFuture: false })
  if (isFail(playedAt)) return playedAt
  const isOfficial = body.is_official === true
  if (isOfficial && kind !== 'tournament') {
    return { ok: false, error: 'Only tournaments can be official.' }
  }
  const scheduledFor = optionalIsoDate(body.scheduled_for, 'Scheduled time', { allowFuture: true })
  if (isFail(scheduledFor)) return scheduledFor
  if (scheduledFor && !isOfficial) {
    return { ok: false, error: 'Only official tournaments can be scheduled ahead of time.' }
  }
  const sponsors = sponsorIds(body.sponsor_ids)
  if (isFail(sponsors)) return sponsors

  return {
    ok: true,
    payload: {
      kind,
      stakes,
      variant,
      location,
      title,
      standard_buy_in_cents: standardBuyIn,
      played_at: playedAt,
      is_official: isOfficial,
      scheduled_for: scheduledFor,
      sponsor_ids: sponsors,
    },
  }
}

function validateEntry(raw: unknown, index: number, kind: PokerSessionKind): PokerEntryInput | Fail {
  if (!isRecord(raw)) return { ok: false, error: `Row ${index + 1} is malformed.` }
  const label = `Row ${index + 1}`
  if (typeof raw.user_id !== 'string' || !UUID_RE.test(raw.user_id)) {
    return { ok: false, error: `${label} needs a player.` }
  }
  const buyIn = optionalCents(raw.buy_in_cents, `${label} buy-in`)
  if (isFail(buyIn)) return buyIn
  const cashOut = optionalCents(raw.cash_out_cents, `${label} cash-out`)
  if (isFail(cashOut)) return cashOut
  let rebuys = 0
  if (raw.rebuy_count != null) {
    if (typeof raw.rebuy_count !== 'number' || !Number.isInteger(raw.rebuy_count)) {
      return { ok: false, error: `${label} rebuys must be a whole number.` }
    }
    if (raw.rebuy_count < 0 || raw.rebuy_count > MAX_REBUYS) {
      return { ok: false, error: `${label} rebuys must be between 0 and ${MAX_REBUYS}.` }
    }
    rebuys = raw.rebuy_count
  }
  let place: number | null = null
  if (raw.finish_place != null) {
    if (kind !== 'tournament') return { ok: false, error: 'Finishing places only apply to tournaments.' }
    if (typeof raw.finish_place !== 'number' || !Number.isInteger(raw.finish_place) || raw.finish_place < 1) {
      return { ok: false, error: `${label} finishing place is invalid.` }
    }
    place = raw.finish_place
  }
  return {
    user_id: raw.user_id,
    buy_in_cents: buyIn ?? 0,
    cash_out_cents: cashOut,
    rebuy_count: rebuys,
    finish_place: place,
  }
}

/**
 * Validates the body of save / finalize / update.
 * `strict` applies the finalize rules (min players, cash-outs present, places consistent).
 * `kind` must be supplied by the route (read from the session) since it isn't in the body.
 */
export function validateSavePayload(
  body: unknown,
  kind: PokerSessionKind,
  opts: { strict: boolean }
): Ok<SaveSessionPayload> | Fail {
  if (!isRecord(body)) return { ok: false, error: 'Invalid request body.' }
  if (typeof body.session_id !== 'string' || !UUID_RE.test(body.session_id)) {
    return { ok: false, error: 'Missing session id.' }
  }
  if (typeof body.version !== 'number' || !Number.isInteger(body.version) || body.version < 1) {
    return { ok: false, error: 'Missing session version.' }
  }

  const title = optionalText(body.title, MAX_TITLE_LENGTH, 'Title')
  if (isFail(title)) return title
  const stakes = optionalText(body.stakes, MAX_STAKES_LENGTH, 'Stakes')
  if (isFail(stakes)) return stakes
  const variant = optionalText(body.variant, MAX_VARIANT_LENGTH, 'Variant')
  if (isFail(variant)) return variant
  const location = optionalText(body.location, MAX_LOCATION_LENGTH, 'Location')
  if (isFail(location)) return location
  const notes = optionalText(body.notes, MAX_NOTES_LENGTH, 'Notes')
  if (isFail(notes)) return notes
  const standardBuyIn = optionalCents(body.standard_buy_in_cents, 'Buy-in')
  if (isFail(standardBuyIn)) return standardBuyIn
  const prizePool = optionalCents(body.prize_pool_cents, 'Prize pool')
  if (isFail(prizePool)) return prizePool
  if (prizePool != null && kind !== 'tournament') {
    return { ok: false, error: 'Prize pool only applies to tournaments.' }
  }
  const playedAt = optionalIsoDate(body.played_at, 'Session date', { allowFuture: false })
  if (isFail(playedAt)) return playedAt
  const scheduledFor = optionalIsoDate(body.scheduled_for, 'Scheduled time', { allowFuture: true })
  if (isFail(scheduledFor)) return scheduledFor
  let duration: number | null = null
  if (body.duration_minutes != null && body.duration_minutes !== '') {
    if (
      typeof body.duration_minutes !== 'number' ||
      !Number.isInteger(body.duration_minutes) ||
      body.duration_minutes < 1 ||
      body.duration_minutes > MAX_DURATION_MINUTES
    ) {
      return { ok: false, error: 'Duration must be between 1 minute and 72 hours.' }
    }
    duration = body.duration_minutes
  }
  const sponsors = sponsorIds(body.sponsor_ids)
  if (isFail(sponsors)) return sponsors

  if (!Array.isArray(body.entries)) return { ok: false, error: 'Ledger rows are missing.' }
  if (body.entries.length > MAX_PLAYERS) {
    return { ok: false, error: `A session can have at most ${MAX_PLAYERS} players.` }
  }
  const entries: PokerEntryInput[] = []
  const seen = new Set<string>()
  for (let i = 0; i < body.entries.length; i++) {
    const e = validateEntry(body.entries[i], i, kind)
    if (isFail(e)) return e
    if (seen.has(e.user_id)) return { ok: false, error: 'Each player can only appear once per session.' }
    seen.add(e.user_id)
    entries.push(e)
  }

  if (opts.strict) {
    if (entries.length < MIN_PLAYERS) {
      return { ok: false, error: `A session needs at least ${MIN_PLAYERS} players.` }
    }
    if (kind === 'cash') {
      if (entries.some((e) => e.cash_out_cents == null)) {
        return {
          ok: false,
          error: 'Every player needs a cash-out before you can log the session — enter 0 for anyone who busted.',
        }
      }
      if (entries.reduce((s, e) => s + e.buy_in_cents, 0) === 0) {
        return { ok: false, error: 'A cash session needs at least one buy-in.' }
      }
    } else {
      const places = entries.map((e) => e.finish_place).filter((p): p is number => p != null)
      if (places.some((p) => p > entries.length)) {
        return { ok: false, error: 'Finishing places must be between 1 and the number of players.' }
      }
      if (new Set(places).size !== places.length) {
        return { ok: false, error: 'Two players cannot share a finishing place.' }
      }
      if (entries.some((e) => (e.cash_out_cents ?? 0) > 0 && e.finish_place == null)) {
        return { ok: false, error: 'A player with a payout needs a finishing place.' }
      }
    }
  }

  return {
    ok: true,
    payload: {
      session_id: body.session_id,
      version: body.version,
      title,
      stakes,
      variant,
      location,
      notes,
      standard_buy_in_cents: standardBuyIn,
      prize_pool_cents: prizePool,
      played_at: playedAt,
      scheduled_for: scheduledFor,
      duration_minutes: duration,
      sponsor_ids: sponsors,
      entries,
    },
  }
}

export function validateDisputeReason(v: unknown): Ok<string> | Fail {
  if (typeof v !== 'string') return { ok: false, error: 'Please give a short reason.' }
  const t = v.trim()
  if (t.length === 0) return { ok: false, error: 'Please give a short reason.' }
  if (t.length > MAX_REASON_LENGTH) {
    return { ok: false, error: `Reason must be ${MAX_REASON_LENGTH} characters or fewer.` }
  }
  return { ok: true, payload: t }
}

export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v)
}
