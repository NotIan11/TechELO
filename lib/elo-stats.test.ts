import { describe, expect, it } from 'vitest'
import { calculateElo, calculateExpectedScore, getInitialRating, getKFactor } from './elo'
import { currentStreak, ratingHistory, recentForm, type CompletedMatchLike } from './stats'

describe('calculateExpectedScore', () => {
  it('is 50/50 for equal ratings', () => {
    expect(calculateExpectedScore(1500, 1500)).toBe(0.5)
  })

  it('favours the higher-rated player and sums to 1', () => {
    const strong = calculateExpectedScore(1900, 1500)
    const weak = calculateExpectedScore(1500, 1900)
    expect(strong).toBeCloseTo(10 / 11, 10) // a 400-point gap is 10:1
    expect(strong + weak).toBeCloseTo(1, 10)
  })
})

describe('calculateElo', () => {
  it('uses 1500 and K=32', () => {
    expect(getInitialRating()).toBe(1500)
    expect(getKFactor()).toBe(32)
  })

  it('moves equal players by half of K', () => {
    expect(calculateElo(1500, 1500, 1)).toEqual({ newRating1: 1516, newRating2: 1484, ratingChange1: 16, ratingChange2: -16 })
    expect(calculateElo(1500, 1500, 2)).toEqual({ newRating1: 1484, newRating2: 1516, ratingChange1: -16, ratingChange2: 16 })
  })

  it('rewards an upset more than an expected win', () => {
    const expected = calculateElo(1900, 1500, 1)
    const upset = calculateElo(1900, 1500, 2)
    expect(expected.ratingChange1).toBe(3)
    expect(expected.ratingChange2).toBe(-3)
    expect(upset.ratingChange1).toBe(-29)
    expect(upset.ratingChange2).toBe(29)
  })

  it('always moves the winner up and the loser down by the same amount (within rounding)', () => {
    for (const [a, b] of [
      [1500, 1500],
      [1612, 1488],
      [1200, 2100],
      [1733, 1731],
    ]) {
      for (const winner of [1, 2] as const) {
        const r = calculateElo(a, b, winner)
        const [won, lost] = winner === 1 ? [r.ratingChange1, r.ratingChange2] : [r.ratingChange2, r.ratingChange1]
        expect(won).toBeGreaterThanOrEqual(0)
        expect(lost).toBeLessThanOrEqual(0)
        expect(Math.abs(won + lost)).toBeLessThanOrEqual(1)
      }
    }
  })
})

function match(over: Partial<CompletedMatchLike> & { day: number }): CompletedMatchLike {
  const { day, ...rest } = over
  const at = `2026-10-${String(day).padStart(2, '0')}T03:00:00.000Z`
  return {
    player1_id: 'me',
    player2_id: 'them',
    winner_id: 'me',
    player1_elo_before: 1500,
    player2_elo_before: 1500,
    player1_elo_after: 1516,
    player2_elo_after: 1484,
    game_type: 'pool',
    completed_at: at,
    created_at: at,
    ...rest,
  }
}

describe('recentForm', () => {
  const matches = [
    match({ day: 1, winner_id: 'me' }),
    match({ day: 3, winner_id: 'them' }),
    match({ day: 2, winner_id: 'me', game_type: 'ping_pong' }),
    match({ day: 4, player1_id: 'them', player2_id: 'me', winner_id: 'me' }),
    match({ day: 5, winner_id: null }), // not completed
    match({ day: 6, player1_id: 'x', player2_id: 'y', winner_id: 'x' }), // someone else's
  ]

  it('lists my results most recent first, on either side of the match', () => {
    expect(recentForm(matches, 'me')).toEqual(['W', 'L', 'W', 'W'])
  })

  it('filters by game and applies the limit', () => {
    expect(recentForm(matches, 'me', 'pool')).toEqual(['W', 'L', 'W'])
    expect(recentForm(matches, 'me', 'ping_pong')).toEqual(['W'])
    expect(recentForm(matches, 'me', undefined, 2)).toEqual(['W', 'L'])
  })

  it('falls back to created_at when completed_at is missing', () => {
    const ms = [
      match({ day: 1, winner_id: 'me' }),
      { ...match({ day: 2, winner_id: 'them' }), completed_at: null },
    ]
    expect(recentForm(ms, 'me')).toEqual(['L', 'W'])
  })
})

describe('currentStreak', () => {
  it('counts the run at the front of the form', () => {
    expect(currentStreak(['W', 'W', 'L', 'W'])).toEqual({ type: 'W', count: 2 })
    expect(currentStreak(['L', 'W'])).toEqual({ type: 'L', count: 1 })
    expect(currentStreak([])).toBeNull()
  })
})

describe('ratingHistory', () => {
  it('starts at the pre-match rating and follows each result in order', () => {
    const matches = [
      match({ day: 2, winner_id: 'them', player1_elo_before: 1516, player1_elo_after: 1499 }),
      match({ day: 1, winner_id: 'me', player1_elo_before: 1500, player1_elo_after: 1516 }),
      match({ day: 3, player1_id: 'them', player2_id: 'me', winner_id: 'me', player2_elo_before: 1499, player2_elo_after: 1515 }),
      match({ day: 4, game_type: 'ping_pong', player1_elo_after: 9999 }),
    ]
    expect(ratingHistory(matches, 'me', 'pool')).toEqual([1500, 1516, 1499, 1515])
  })

  it('is empty with no completed matches and defaults a missing start to 1500', () => {
    expect(ratingHistory([], 'me', 'pool')).toEqual([])
    expect(ratingHistory([match({ day: 1, player1_elo_before: null })], 'me', 'pool')).toEqual([1500, 1516])
  })
})
