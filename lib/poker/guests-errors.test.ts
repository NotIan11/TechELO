import { describe, expect, it } from 'vitest'
import { pokerRpcErrorMessage, pokerRpcErrorStatus } from './errors'
import { guestAsPlayer, suggestMatches } from './guests'

describe('guestAsPlayer', () => {
  it('presents a guest as a player with no profile', () => {
    expect(guestAsPlayer({ id: 'g1', name: 'Sam' })).toEqual({
      id: 'g1',
      display_name: 'Sam',
      profile_image_url: null,
      guest: true,
      dorm_name: null,
    })
  })
})

describe('suggestMatches', () => {
  const people = ['Sam Lee', 'Samantha Park', 'Alex Kim', 'Lee Wong', 'Pat Smith'].map((display_name) => ({ display_name }))
  const names = (guest: string, limit?: number) => suggestMatches(guest, people, limit).map((p) => p.display_name)

  it('puts exact word matches ahead of prefix matches', () => {
    expect(names('Sam')).toEqual(['Sam Lee', 'Samantha Park'])
  })

  it('scores every shared word', () => {
    expect(names('sam lee')).toEqual(['Sam Lee', 'Lee Wong', 'Samantha Park'])
  })

  it('ignores case, punctuation and one-letter words', () => {
    expect(names('ALEX K.')).toEqual(['Alex Kim'])
  })

  it('returns nothing when there is nothing to go on', () => {
    expect(names('')).toEqual([])
    expect(names('J')).toEqual([])
    expect(names('Zoltan')).toEqual([])
  })

  it('respects the limit', () => {
    expect(names('sam lee', 1)).toEqual(['Sam Lee'])
  })
})

describe('pokerRpcErrorMessage', () => {
  it('maps known codes to friendly copy', () => {
    expect(pokerRpcErrorMessage({ message: 'STALE_VERSION' })).toMatch(/changed on another device/)
    expect(pokerRpcErrorMessage('NOT_HOST')).toBe('Only the host can change this session.')
  })

  it('distinguishes codes that share a prefix', () => {
    expect(pokerRpcErrorMessage({ message: 'INVALID_ENTRIES' })).toBe('Ledger data is malformed.')
    expect(pokerRpcErrorMessage({ message: 'INVALID_ENTRY' })).toBe('Each row needs a player.')
  })

  it('falls back to Postgres error codes, then the raw message', () => {
    expect(pokerRpcErrorMessage({ code: '23505', message: 'duplicate key value' })).toBe(
      'Each player can only appear once per session.'
    )
    expect(pokerRpcErrorMessage({ code: '23514', message: 'check violation' })).toMatch(/whole cents/)
    expect(pokerRpcErrorMessage({ message: 'boom' })).toBe('boom')
    expect(pokerRpcErrorMessage(null)).toBe('Something went wrong.')
  })
})

describe('pokerRpcErrorStatus', () => {
  it.each([
    ['NOT_AUTHENTICATED', 401],
    ['SESSION_NOT_FOUND', 404],
    ['ENTRY_NOT_FOUND', 404],
    ['GUEST_NOT_FOUND', 404],
    ['NOT_HOST', 403],
    ['NOT_OFFICER', 403],
    ['NOT_YOUR_ENTRY', 403],
    ['NOT_GUEST_OWNER', 403],
    ['STALE_VERSION', 409],
    ['WRONG_STATUS', 409],
    ['LIVE_SESSION_EXISTS', 409],
    ['GUEST_LINK_CONFLICT', 409],
    ['GUEST_NOT_LINKED', 409],
    ['INVALID_AMOUNT', 400],
    ['something unexpected', 400],
  ])('%s → %i', (message, status) => {
    expect(pokerRpcErrorStatus({ message })).toBe(status)
  })
})
