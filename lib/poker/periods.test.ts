import { describe, expect, it } from 'vitest'
import {
  formatPokerDateTime,
  fromDateTimeLocalValue,
  isPokerPeriod,
  periodBounds,
  periodLabel,
  termFor,
  termLabel,
  termShortLabel,
  toDateTimeLocalValue,
  zonedMidnight,
} from './periods'

// Pacific time in 2026: PST (UTC-8) until Mar 8, PDT (UTC-7) until Nov 1, then PST again.

describe('zonedMidnight', () => {
  it('is 08:00 UTC during standard time', () => {
    expect(zonedMidnight(2026, 1, 1).toISOString()).toBe('2026-01-01T08:00:00.000Z')
  })

  it('is 07:00 UTC during daylight time', () => {
    expect(zonedMidnight(2026, 6, 15).toISOString()).toBe('2026-06-15T07:00:00.000Z')
  })

  it('is correct on the changeover days themselves', () => {
    // Midnight comes before the 2am switch, so it still uses the old offset
    expect(zonedMidnight(2026, 3, 8).toISOString()).toBe('2026-03-08T08:00:00.000Z')
    expect(zonedMidnight(2026, 11, 1).toISOString()).toBe('2026-11-01T07:00:00.000Z')
  })
})

describe('termFor', () => {
  it('finds the term in the middle of each quarter', () => {
    expect(termFor(new Date('2026-02-10T20:00:00Z')).label).toBe('Winter 2026')
    expect(termFor(new Date('2026-05-01T20:00:00Z')).label).toBe('Spring 2026')
    expect(termFor(new Date('2026-07-20T20:00:00Z')).label).toBe('Summer 2026')
    expect(termFor(new Date('2026-11-24T20:00:00Z')).label).toBe('Fall 2026')
  })

  it('switches term at local midnight, not UTC midnight', () => {
    // 06:59Z on Mar 25 is still 11:59pm on Mar 24 in Pasadena
    expect(termFor(new Date('2026-03-25T06:59:59Z')).label).toBe('Winter 2026')
    expect(termFor(new Date('2026-03-25T07:00:00Z')).label).toBe('Spring 2026')
  })

  it('keeps New Year’s Eve night in Fall of the old year', () => {
    expect(termFor(new Date('2027-01-01T07:59:59Z')).label).toBe('Fall 2026')
    expect(termFor(new Date('2027-01-01T08:00:00Z')).label).toBe('Winter 2027')
  })

  it('gives Fall an end in the following January', () => {
    const fall = termFor(new Date('2026-11-24T20:00:00Z'))
    expect(fall.start.toISOString()).toBe('2026-09-20T07:00:00.000Z')
    expect(fall.end.toISOString()).toBe('2027-01-01T08:00:00.000Z')
  })

  it('has contiguous terms: each start is inside the term, each end is not', () => {
    for (const iso of ['2026-02-10T20:00:00Z', '2026-05-01T20:00:00Z', '2026-07-20T20:00:00Z', '2026-11-24T20:00:00Z']) {
      const t = termFor(new Date(iso))
      expect(termFor(t.start).label).toBe(t.label)
      expect(termFor(new Date(t.end.getTime() - 1)).label).toBe(t.label)
      expect(termFor(t.end).label).not.toBe(t.label)
    }
  })
})

describe('term labels', () => {
  it('accepts dates or ISO strings', () => {
    expect(termLabel('2026-10-10T19:00:00Z')).toBe('Fall 2026')
    expect(termLabel(new Date('2026-04-10T19:00:00Z'))).toBe('Spring 2026')
    expect(termShortLabel('2026-10-10T19:00:00Z')).toBe("Fall '26")
  })
})

describe('periodBounds', () => {
  const now = new Date('2026-11-24T20:00:00Z')

  it('term starts at the term start', () => {
    expect(periodBounds('term', now)).toEqual({ since: '2026-09-20T07:00:00.000Z', until: null })
  })

  it('30d is exactly thirty days back', () => {
    expect(periodBounds('30d', now)).toEqual({ since: '2026-10-25T20:00:00.000Z', until: null })
  })

  it('year starts at local Jan 1', () => {
    expect(periodBounds('year', now)).toEqual({ since: '2026-01-01T08:00:00.000Z', until: null })
  })

  it('year uses the Pacific calendar year, even when UTC has already rolled over', () => {
    const nye = new Date('2027-01-01T07:59:00Z') // 11:59pm Dec 31, 2026 in Pasadena
    expect(periodBounds('year', nye).since).toBe('2026-01-01T08:00:00.000Z')
    expect(periodLabel('year', nye)).toBe('2026')
  })

  it('all-time is unbounded', () => {
    expect(periodBounds('all', now)).toEqual({ since: null, until: null })
  })
})

describe('periodLabel / isPokerPeriod', () => {
  it('labels each period', () => {
    const now = new Date('2026-11-24T20:00:00Z')
    expect(periodLabel('term', now)).toBe('Fall 2026')
    expect(periodLabel('30d', now)).toBe('last 30 days')
    expect(periodLabel('all', now)).toBe('all-time')
  })

  it('recognises only the four periods', () => {
    expect(['term', '30d', 'year', 'all'].every(isPokerPeriod)).toBe(true)
    expect(isPokerPeriod('week')).toBe(false)
    expect(isPokerPeriod(null)).toBe(false)
    expect(isPokerPeriod(undefined)).toBe(false)
  })
})

describe('datetime-local conversion', () => {
  it('renders an instant as Pacific wall-clock time', () => {
    expect(toDateTimeLocalValue(new Date('2026-07-04T19:30:00Z'))).toBe('2026-07-04T12:30')
    expect(toDateTimeLocalValue(new Date('2026-01-15T08:05:00Z'))).toBe('2026-01-15T00:05')
  })

  it('parses Pacific wall-clock time back to an instant', () => {
    expect(fromDateTimeLocalValue('2026-07-04T12:30')).toBe('2026-07-04T19:30:00.000Z')
    expect(fromDateTimeLocalValue('2026-01-15T21:00')).toBe('2026-01-16T05:00:00.000Z')
  })

  it('rejects malformed input', () => {
    expect(fromDateTimeLocalValue('')).toBeNull()
    expect(fromDateTimeLocalValue('2026-07-04')).toBeNull()
    expect(fromDateTimeLocalValue('tomorrow')).toBeNull()
  })

  it('handles the afternoon of the spring-forward day', () => {
    // Mar 8, 2026: clocks jump 2am → 3am, so noon is PDT (UTC-7)
    expect(fromDateTimeLocalValue('2026-03-08T12:00')).toBe('2026-03-08T19:00:00.000Z')
  })

  it('handles the afternoon of the fall-back day', () => {
    // Nov 1, 2026: clocks fall 2am → 1am, so noon is PST (UTC-8)
    expect(fromDateTimeLocalValue('2026-11-01T12:00')).toBe('2026-11-01T20:00:00.000Z')
  })

  it('round-trips, including on changeover days', () => {
    for (const value of [
      '2026-01-15T00:05',
      '2026-07-04T12:30',
      '2026-03-08T01:30',
      '2026-03-08T12:00',
      '2026-03-08T23:59',
      '2026-11-01T00:30',
      '2026-11-01T12:00',
      '2026-11-01T23:59',
      '2026-12-31T23:59',
    ]) {
      const iso = fromDateTimeLocalValue(value)
      expect(iso).not.toBeNull()
      expect(toDateTimeLocalValue(new Date(iso!))).toBe(value)
    }
  })
})

describe('formatPokerDateTime', () => {
  it('formats in Pacific time regardless of the machine time zone', () => {
    const out = formatPokerDateTime('2026-07-05T02:30:00Z') // 7:30pm Jul 4 in Pasadena
    expect(out).toContain('Jul 4, 2026')
    expect(out).toContain('7:30')
  })

  it('can omit the time', () => {
    expect(formatPokerDateTime('2026-07-05T02:30:00Z', false)).toBe('Jul 4, 2026')
  })
})
