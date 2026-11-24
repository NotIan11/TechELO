import { describe, expect, it } from 'vitest'
import {
  centsToInputText,
  formatCents,
  formatDuration,
  formatRoi,
  ordinal,
  parseDollarsToCents,
} from './money'

describe('parseDollarsToCents', () => {
  it.each([
    ['20', 2000],
    ['20.5', 2050],
    ['20.50', 2050],
    ['$20.50', 2050],
    ['1,250', 125000],
    [' .5 ', 50],
    ['5.', 500],
    ['0', 0],
    ['0.01', 1],
    ['0.07', 7],
    ['9999999.99', 999999999],
  ])('parses %j as %i cents', (input, cents) => {
    expect(parseDollarsToCents(input)).toBe(cents)
  })

  it.each(['', '   ', '$', '.', 'abc', '-5', '1.234', '1.2.3', '12345678', '1e3', '20 dollars'])(
    'rejects %j',
    (input) => {
      expect(parseDollarsToCents(input)).toBeNull()
    }
  )

  it('never drifts by a cent on values floats get wrong', () => {
    // 0.29 * 100 === 28.999999999999996 and 1.15 * 100 === 114.99999999999999 in floating point
    expect(parseDollarsToCents('0.29')).toBe(29)
    expect(parseDollarsToCents('1.15')).toBe(115)
    expect(parseDollarsToCents('4.35')).toBe(435)
  })
})

describe('centsToInputText', () => {
  it('drops the decimals on whole dollars and pads cents otherwise', () => {
    expect(centsToInputText(2000)).toBe('20')
    expect(centsToInputText(2050)).toBe('20.50')
    expect(centsToInputText(5)).toBe('0.05')
    expect(centsToInputText(0)).toBe('0')
  })

  it('returns an empty string for a missing value', () => {
    expect(centsToInputText(null)).toBe('')
  })

  it('round-trips through parseDollarsToCents', () => {
    for (const cents of [0, 1, 9, 10, 99, 100, 101, 2050, 123456, 10_000_000]) {
      expect(parseDollarsToCents(centsToInputText(cents))).toBe(cents)
    }
  })
})

describe('formatCents', () => {
  it('formats with two decimals by default', () => {
    expect(formatCents(123450)).toBe('$1,234.50')
    expect(formatCents(0)).toBe('$0.00')
  })

  it('uses a real minus sign for losses', () => {
    expect(formatCents(-2000)).toBe('−$20.00')
    expect(formatCents(-2000, { sign: true, compact: true })).toBe('−$20')
  })

  it('only adds a plus when asked, and never on zero', () => {
    expect(formatCents(4500)).toBe('$45.00')
    expect(formatCents(4500, { sign: true })).toBe('+$45.00')
    expect(formatCents(0, { sign: true })).toBe('$0.00')
  })

  it('compact drops decimals only when there are no cents', () => {
    expect(formatCents(4500, { compact: true })).toBe('$45')
    expect(formatCents(4550, { compact: true })).toBe('$45.50')
  })

  it('treats non-finite input as zero', () => {
    expect(formatCents(NaN)).toBe('$0.00')
    expect(formatCents(Infinity)).toBe('$0.00')
  })
})

describe('formatRoi', () => {
  it('rounds and signs', () => {
    expect(formatRoi(81.8)).toBe('+82%')
    expect(formatRoi(-33.4)).toBe('-33%')
    expect(formatRoi(0)).toBe('0%')
  })

  it('shows a dash when there is no ROI', () => {
    expect(formatRoi(null)).toBe('—')
    expect(formatRoi(undefined)).toBe('—')
    expect(formatRoi(NaN)).toBe('—')
  })
})

describe('formatDuration', () => {
  it('formats hours and minutes', () => {
    expect(formatDuration(45)).toBe('45m')
    expect(formatDuration(120)).toBe('2h')
    expect(formatDuration(150)).toBe('2h 30m')
  })

  it('shows a dash for missing or non-positive durations', () => {
    expect(formatDuration(null)).toBe('—')
    expect(formatDuration(0)).toBe('—')
    expect(formatDuration(-5)).toBe('—')
  })
})

describe('ordinal', () => {
  it.each([
    [1, '1st'],
    [2, '2nd'],
    [3, '3rd'],
    [4, '4th'],
    [11, '11th'],
    [12, '12th'],
    [13, '13th'],
    [21, '21st'],
    [22, '22nd'],
    [23, '23rd'],
    [101, '101st'],
    [111, '111th'],
  ])('%i → %s', (n, label) => {
    expect(ordinal(n)).toBe(label)
  })
})
