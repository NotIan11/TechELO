import { describe, expect, it } from 'vitest'
import { countWord, daysAgo, headToHead, rankByRating, ratingChangeFor, ratingChangesSince, type CompletedMatchLike } from './stats'
import { waitingHeadline } from './inbox'

function match(over: Partial<CompletedMatchLike>): CompletedMatchLike {
  return {
    player1_id: 'a',
    player2_id: 'b',
    winner_id: 'a',
    player1_elo_before: 1500,
    player2_elo_before: 1500,
    player1_elo_after: 1516,
    player2_elo_after: 1484,
    game_type: 'pool',
    completed_at: '2026-11-20T12:00:00Z',
    created_at: '2026-11-20T11:00:00Z',
    ...over,
  }
}

describe('ratingChangeFor', () => {
  it('reads the change for either seat', () => {
    const m = match({})
    expect(ratingChangeFor(m, 'a')).toBe(16)
    expect(ratingChangeFor(m, 'b')).toBe(-16)
  })

  it('is null for a bystander, an unfinished match, or a missing rating', () => {
    expect(ratingChangeFor(match({}), 'c')).toBeNull()
    expect(ratingChangeFor(match({ winner_id: null }), 'a')).toBeNull()
    expect(ratingChangeFor(match({ player1_elo_after: null }), 'a')).toBeNull()
  })
})

describe('ratingChangesSince', () => {
  const matches = [
    match({}),
    match({ player1_id: 'b', player2_id: 'c', winner_id: 'c', player1_elo_before: 1484, player1_elo_after: 1469, player2_elo_before: 1500, player2_elo_after: 1515, completed_at: '2026-11-22T12:00:00Z' }),
    match({ completed_at: '2026-10-01T12:00:00Z', player1_elo_after: 1540, player2_elo_after: 1460 }),
    match({ game_type: 'ping_pong', player1_elo_after: 1600, player2_elo_after: 1400 }),
    match({ winner_id: null, player1_elo_after: null, player2_elo_after: null }),
  ]

  it('sums each player inside the window and the game', () => {
    expect(ratingChangesSince(matches, new Date('2026-11-01T00:00:00Z'), 'pool')).toEqual({ a: 16, b: -31, c: 15 })
  })

  it('includes every game when none is given', () => {
    expect(ratingChangesSince(matches, new Date('2026-11-01T00:00:00Z'))).toEqual({ a: 116, b: -131, c: 15 })
  })

  it('leaves out players with nothing in the window', () => {
    expect(ratingChangesSince(matches, new Date('2026-11-21T00:00:00Z'), 'pool')).toEqual({ b: -15, c: 15 })
    expect(ratingChangesSince(matches, Date.parse('2027-01-01T00:00:00Z'))).toEqual({})
  })

  it('falls back to created_at when completed_at is missing', () => {
    const m = match({ completed_at: null, created_at: '2026-11-23T00:00:00Z' })
    expect(ratingChangesSince([m], new Date('2026-11-22T00:00:00Z'))).toEqual({ a: 16, b: -16 })
  })
})

describe('headToHead', () => {
  it('counts wins in either seat and ignores other pairings and games', () => {
    const matches = [
      match({}),
      match({ player1_id: 'b', player2_id: 'a', winner_id: 'b' }),
      match({ winner_id: 'b' }),
      match({ player2_id: 'c' }),
      match({ game_type: 'ping_pong' }),
      match({ winner_id: null }),
    ]
    expect(headToHead(matches, 'a', 'b', 'pool')).toEqual({ aWins: 1, bWins: 2 })
    expect(headToHead(matches, 'b', 'a', 'pool')).toEqual({ aWins: 2, bWins: 1 })
    expect(headToHead(matches, 'a', 'b')).toEqual({ aWins: 2, bWins: 2 })
    expect(headToHead([], 'a', 'b')).toEqual({ aWins: 0, bWins: 0 })
  })
})

describe('rankByRating', () => {
  it('orders by rating then wins and skips players without a match', () => {
    expect(
      rankByRating([
        { user_id: 'a', rating: 1500, matches_played: 4, wins: 2 },
        { user_id: 'b', rating: 1600, matches_played: 3, wins: 3 },
        { user_id: 'c', rating: 1500, matches_played: 6, wins: 3 },
        { user_id: 'd', rating: 1700, matches_played: 0, wins: 0 },
      ])
    ).toEqual({ b: 1, c: 2, a: 3 })
  })
})

describe('daysAgo', () => {
  it('steps back whole days from the given instant', () => {
    expect(daysAgo(7, new Date('2026-11-24T08:00:00Z')).toISOString()).toBe('2026-11-17T08:00:00.000Z')
    expect(daysAgo(0, new Date('2026-11-24T08:00:00Z')).toISOString()).toBe('2026-11-24T08:00:00.000Z')
  })
})

describe('countWord and waitingHeadline', () => {
  it('spells out small counts', () => {
    expect(countWord(0)).toBe('zero')
    expect(countWord(3)).toBe('three')
    expect(countWord(12)).toBe('twelve')
    expect(countWord(13)).toBe('13')
  })

  it('states the queue in words', () => {
    expect(waitingHeadline(0)).toBe('Nothing is waiting on you.')
    expect(waitingHeadline(1)).toBe('One thing is waiting on you.')
    expect(waitingHeadline(3)).toBe('Three things are waiting on you.')
    expect(waitingHeadline(14)).toBe('14 things are waiting on you.')
  })
})
