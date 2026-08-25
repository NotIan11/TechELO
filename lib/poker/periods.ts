import type { PokerPeriod } from './types'

/**
 * Term boundaries (America/Los_Angeles). A term runs from its start date up to
 * the next entry's start date; Fall wraps into the following January.
 */
export const TERM_STARTS: { month: number; day: number; name: string }[] = [
  { month: 1, day: 1, name: 'Winter' },
  { month: 3, day: 25, name: 'Spring' },
  { month: 6, day: 15, name: 'Summer' },
  { month: 9, day: 20, name: 'Fall' },
]

export const TIME_ZONE = 'America/Los_Angeles'

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
})

interface LocalParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

function localParts(date: Date): LocalParts {
  const out: Record<string, number> = {}
  for (const p of partsFormatter.formatToParts(date)) {
    if (p.type !== 'literal') out[p.type] = Number(p.value)
  }
  return {
    year: out.year,
    month: out.month,
    day: out.day,
    hour: out.hour === 24 ? 0 : out.hour,
    minute: out.minute,
  }
}

/** The instant of local midnight in TIME_ZONE for the given calendar date. */
export function zonedMidnight(year: number, month: number, day: number): Date {
  const guess = Date.UTC(year, month - 1, day, 0, 0, 0)
  const lp = localParts(new Date(guess))
  const asUtc = Date.UTC(lp.year, lp.month - 1, lp.day, lp.hour, lp.minute)
  const offset = asUtc - guess
  return new Date(guess - offset)
}

export interface Term {
  name: string
  year: number
  start: Date
  /** exclusive */
  end: Date
  label: string
}

/** Term containing `date` (defaults to now). */
export function termFor(date: Date = new Date()): Term {
  const { year, month, day } = localParts(date)
  // Find the last term start on or before (month, day)
  let idx = -1
  for (let i = 0; i < TERM_STARTS.length; i++) {
    const t = TERM_STARTS[i]
    if (month > t.month || (month === t.month && day >= t.day)) idx = i
  }
  // Before Jan 1 can't happen; guard anyway by wrapping to previous Fall.
  let startYear = year
  if (idx === -1) {
    idx = TERM_STARTS.length - 1
    startYear = year - 1
  }
  const cur = TERM_STARTS[idx]
  const next = TERM_STARTS[(idx + 1) % TERM_STARTS.length]
  const nextYear = idx === TERM_STARTS.length - 1 ? startYear + 1 : startYear
  return {
    name: cur.name,
    year: startYear,
    start: zonedMidnight(startYear, cur.month, cur.day),
    end: zonedMidnight(nextYear, next.month, next.day),
    label: `${cur.name} ${startYear}`,
  }
}

export function termLabel(date: Date | string = new Date()): string {
  return termFor(typeof date === 'string' ? new Date(date) : date).label
}

/** Short label like "Fall '26" */
export function termShortLabel(date: Date | string = new Date()): string {
  const t = termFor(typeof date === 'string' ? new Date(date) : date)
  return `${t.name} '${String(t.year).slice(-2)}`
}

/** Inclusive `since` / exclusive `until` ISO bounds for a period filter. */
export function periodBounds(
  period: PokerPeriod,
  now: Date = new Date()
): { since: string | null; until: string | null } {
  switch (period) {
    case 'term': {
      const t = termFor(now)
      return { since: t.start.toISOString(), until: null }
    }
    case '30d':
      return { since: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(), until: null }
    case 'year': {
      const { year } = localParts(now)
      return { since: zonedMidnight(year, 1, 1).toISOString(), until: null }
    }
    case 'all':
    default:
      return { since: null, until: null }
  }
}

export function isPokerPeriod(value: string | null | undefined): value is PokerPeriod {
  return value === 'term' || value === '30d' || value === 'year' || value === 'all'
}

/** Human label for the active period, used in headings ("this term", "all-time") */
export function periodLabel(period: PokerPeriod, now: Date = new Date()): string {
  switch (period) {
    case 'term':
      return termFor(now).label
    case '30d':
      return 'last 30 days'
    case 'year':
      return String(localParts(now).year)
    default:
      return 'all-time'
  }
}

/** Value for a `datetime-local` input, in TIME_ZONE */
export function toDateTimeLocalValue(date: Date = new Date()): string {
  const { year, month, day, hour, minute } = localParts(date)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`
}

/** Parse a `datetime-local` value as TIME_ZONE wall-clock time → ISO instant */
export function fromDateTimeLocalValue(value: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value)
  if (!m) return null
  const [, y, mo, d, h, mi] = m.map(Number) as unknown as number[]
  const midnight = zonedMidnight(y, mo, d)
  return new Date(midnight.getTime() + (h * 60 + mi) * 60_000).toISOString()
}

/** Date/time formatted in TIME_ZONE so server and client agree */
export function formatPokerDateTime(date: Date | string, withTime = true): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('en-US', {
    timeZone: TIME_ZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  })
}
