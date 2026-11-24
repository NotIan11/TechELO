import { describe, expect, it } from 'vitest'
import {
  ackSummary,
  binkOfTheNight,
  computeTotals,
  confirmableCount,
  cumulativePnl,
  emptySummary,
  groupAwards,
  isVerified,
  placeLabel,
  playerSummary,
  resultOf,
  sessionResults,
  sessionTitle,
  sortByPlayed,
  tablemates,
} from './stats'
import type { PlayerRef, PokerCountedEntry } from './types'

let seq = 0

/** A counted entry with sensible defaults. `net` and `day` are shorthands. */
function entry(over: Partial<PokerCountedEntry> & { net?: number; day?: number } = {}): PokerCountedEntry {
  const { net, day, ...rest } = over
  seq++
  const buyIn = rest.buy_in_cents ?? 2000
  const netCents = rest.net_cents ?? net ?? 0
  return {
    id: `e${String(seq).padStart(4, '0')}`,
    session_id: `s${seq}`,
    user_id: 'alice',
    guest_id: null,
    buy_in_cents: buyIn,
    cash_out_cents: buyIn + netCents,
    rebuy_count: 0,
    net_cents: netCents,
    finish_place: null,
    acknowledged_at: null,
    disputed_at: null,
    kind: 'cash',
    status: 'final',
    played_at: `2026-10-${String(day ?? 1).padStart(2, '0')}T03:00:00.000Z`,
    duration_minutes: null,
    player_count: 4,
    host_id: 'host',
    title: null,
    stakes: null,
    variant: null,
    is_official: false,
    ...rest,
  }
}

const player = (id: string, name = id): PlayerRef => ({ id, display_name: name, profile_image_url: null })

describe('resultOf / sortByPlayed', () => {
  it('classifies wins, losses and break-evens', () => {
    expect(resultOf(1)).toBe('W')
    expect(resultOf(-1)).toBe('L')
    expect(resultOf(0)).toBe('E')
  })

  it('sorts oldest first, ties broken by id, without mutating the input', () => {
    const a = entry({ id: 'b', day: 2 })
    const b = entry({ id: 'a', day: 2 })
    const c = entry({ id: 'c', day: 1 })
    const input = [a, b, c]
    expect(sortByPlayed(input).map((e) => e.id)).toEqual(['c', 'a', 'b'])
    expect(input.map((e) => e.id)).toEqual(['b', 'a', 'c'])
  })
})

describe('playerSummary', () => {
  it('returns the empty summary for no entries', () => {
    expect(playerSummary([])).toEqual(emptySummary())
  })

  it('computes the headline numbers regardless of input order', () => {
    const entries = [
      entry({ day: 4, buy_in_cents: 500, net: 500, duration_minutes: 60, rebuy_count: 2 }),
      entry({ day: 2, buy_in_cents: 2000, net: -2000 }), // untimed
      entry({ day: 1, buy_in_cents: 2000, net: 5000, duration_minutes: 120 }),
      entry({ day: 3, buy_in_cents: 1000, net: 1000, duration_minutes: 60 }),
    ]
    const s = playerSummary(entries)
    expect(s.sessions).toBe(4)
    expect(s.netCents).toBe(4500)
    expect(s.stakedCents).toBe(5500)
    expect(s.cashedOutCents).toBe(10000)
    expect(s.roiPct).toBeCloseTo((4500 / 5500) * 100, 6)
    expect(s.winningSessions).toBe(3)
    expect(s.winningPct).toBe(75)
    expect(s.biggestWinCents).toBe(5000)
    expect(s.biggestLossCents).toBe(-2000)
    expect(s.avgBuyInCents).toBe(1375)
    expect(s.avgNetCents).toBe(1125)
    expect(s.totalRebuys).toBe(2)
  })

  it('money in minus money out equals net', () => {
    const entries = [entry({ net: 1234 }), entry({ net: -2000 }), entry({ net: 1 }), entry({ net: 0 })]
    const s = playerSummary(entries)
    expect(s.cashedOutCents - s.stakedCents).toBe(s.netCents)
  })

  it('bases the hourly rate only on sessions that recorded a duration', () => {
    const s = playerSummary([
      entry({ day: 1, net: 5000, duration_minutes: 120 }),
      entry({ day: 2, net: -2000 }), // no duration: excluded from hourly
      entry({ day: 3, net: 1000, duration_minutes: 60 }),
      entry({ day: 4, net: 500, duration_minutes: 60 }),
    ])
    expect(s.hoursPlayed).toBe(4)
    expect(s.hourlyCents).toBe(1625) // (5000 + 1000 + 500) / 4h
  })

  it('has no hours or hourly rate when no session was timed', () => {
    const s = playerSummary([entry({ net: 100 }), entry({ net: 200, duration_minutes: 0 })])
    expect(s.hoursPlayed).toBeNull()
    expect(s.hourlyCents).toBeNull()
  })

  it('has no ROI when nothing was staked (freerolls)', () => {
    const s = playerSummary([entry({ buy_in_cents: 0, cash_out_cents: 5000, net_cents: 5000 })])
    expect(s.roiPct).toBeNull()
    expect(s.netCents).toBe(5000)
  })

  it('treats a missing cash-out as zero cashed out', () => {
    const s = playerSummary([entry({ buy_in_cents: 2000, cash_out_cents: null, net_cents: -2000 })])
    expect(s.cashedOutCents).toBe(0)
  })

  describe('streaks', () => {
    const nets = (...values: number[]) => values.map((net, i) => entry({ day: i + 1, net }))

    it('tracks current and longest streaks', () => {
      const s = playerSummary(nets(100, 100, 100, -50, -50, 100, 100))
      expect(s.currentStreak).toEqual({ type: 'W', count: 2 })
      expect(s.longestWinStreak).toBe(3)
      expect(s.longestLossStreak).toBe(2)
    })

    it('reports a current losing streak', () => {
      const s = playerSummary(nets(100, -1, -1, -1))
      expect(s.currentStreak).toEqual({ type: 'L', count: 3 })
      expect(s.longestLossStreak).toBe(3)
    })

    it('a break-even session ends a streak', () => {
      const s = playerSummary(nets(100, 100, 0, 100))
      expect(s.currentStreak).toEqual({ type: 'W', count: 1 })
      expect(s.longestWinStreak).toBe(2)
    })

    it('has no current streak when the latest session broke even', () => {
      const s = playerSummary(nets(100, 100, 0))
      expect(s.currentStreak).toBeNull()
      expect(s.longestWinStreak).toBe(2)
    })

    it('uses play order, not input order', () => {
      const s = playerSummary([entry({ day: 3, net: 100 }), entry({ day: 1, net: -100 }), entry({ day: 2, net: 100 })])
      expect(s.currentStreak).toEqual({ type: 'W', count: 2 })
    })
  })

  it('summarises tournaments separately from cash games', () => {
    const s = playerSummary([
      entry({ day: 1, kind: 'tournament', buy_in_cents: 1000, cash_out_cents: 10000, net_cents: 9000, finish_place: 1 }),
      entry({ day: 2, kind: 'tournament', buy_in_cents: 1000, cash_out_cents: 0, net_cents: -1000, finish_place: 3 }),
      entry({ day: 3, kind: 'tournament', buy_in_cents: 1000, cash_out_cents: 0, net_cents: -1000, finish_place: null }),
      entry({ day: 4, kind: 'cash', buy_in_cents: 2000, cash_out_cents: 6000, net_cents: 4000 }),
    ])
    expect(s.tournament.entries).toBe(3)
    expect(s.tournament.cashes).toBe(1)
    expect(s.tournament.itmPct).toBeCloseTo(100 / 3, 6)
    expect(s.tournament.bestFinish).toBe(1)
    expect(s.tournament.firstPlaces).toBe(1)
    expect(s.tournament.winningsCents).toBe(10000)
  })

  it('has empty tournament stats for a cash-only player', () => {
    const s = playerSummary([entry({ net: 100 })])
    expect(s.tournament).toEqual(emptySummary().tournament)
  })
})

describe('cumulativePnl', () => {
  it('builds a running total oldest to newest', () => {
    const points = cumulativePnl([entry({ day: 3, net: 500 }), entry({ day: 1, net: 1000 }), entry({ day: 2, net: -3000 })])
    expect(points.map((p) => p.netCents)).toEqual([1000, -3000, 500])
    expect(points.map((p) => p.cumulativeCents)).toEqual([1000, -2000, -1500])
  })

  it('ends at the player’s total net', () => {
    const entries = [entry({ day: 1, net: 777 }), entry({ day: 2, net: -1234 }), entry({ day: 3, net: 9 })]
    expect(cumulativePnl(entries).at(-1)?.cumulativeCents).toBe(playerSummary(entries).netCents)
  })

  it('is empty for no entries', () => {
    expect(cumulativePnl([])).toEqual([])
  })
})

describe('sessionResults', () => {
  it('lists results most recent first and skips break-evens', () => {
    const entries = [entry({ day: 1, net: 100 }), entry({ day: 2, net: 0 }), entry({ day: 3, net: -100 }), entry({ day: 4, net: 100 })]
    expect(sessionResults(entries)).toEqual(['W', 'L', 'W'])
  })

  it('applies the limit after skipping break-evens', () => {
    const entries = [entry({ day: 1, net: -1 }), entry({ day: 2, net: 1 }), entry({ day: 3, net: 0 }), entry({ day: 4, net: 1 })]
    expect(sessionResults(entries, 2)).toEqual(['W', 'W'])
  })
})

describe('binkOfTheNight', () => {
  it('picks the biggest winner', () => {
    const rows = [{ net_cents: 500 }, { net_cents: 2500 }, { net_cents: -3000 }]
    expect(binkOfTheNight(rows)).toBe(rows[1])
  })

  it('is null when nobody finished up', () => {
    expect(binkOfTheNight([{ net_cents: 0 }, { net_cents: 0 }])).toBeNull()
    expect(binkOfTheNight([{ net_cents: -100 }, { net_cents: -200 }])).toBeNull()
  })

  it('needs at least two rows', () => {
    expect(binkOfTheNight([])).toBeNull()
    expect(binkOfTheNight([{ net_cents: 500 }])).toBeNull()
  })
})

describe('ackSummary', () => {
  const row = (user_id: string | null, acked = false, disputed = false) => ({
    user_id,
    acknowledged_at: acked ? '2026-10-01T00:00:00Z' : null,
    disputed_at: disputed ? '2026-10-01T00:00:00Z' : null,
  })

  it('counts acknowledgements and disputes', () => {
    expect(ackSummary([row('a', true), row('b'), row('c', false, true)])).toEqual({
      acked: 1,
      total: 3,
      disputed: 1,
      guests: 0,
      verified: false,
    })
  })

  it('is verified once every account holder has acknowledged', () => {
    expect(ackSummary([row('a', true), row('b', true)]).verified).toBe(true)
  })

  it('does not wait on guests, who cannot confirm', () => {
    const s = ackSummary([row('a', true), row('b', true), row(null)])
    expect(s).toEqual({ acked: 2, total: 2, disputed: 0, guests: 1, verified: true })
  })

  it('is never verified with nobody able to confirm', () => {
    expect(ackSummary([]).verified).toBe(false)
    expect(ackSummary([row(null), row(null)]).verified).toBe(false)
  })
})

describe('confirmableCount / isVerified', () => {
  it('subtracts guests from the player count', () => {
    expect(confirmableCount({ player_count: 6, guest_count: 2 })).toBe(4)
    expect(confirmableCount({ player_count: 6 })).toBe(6)
    expect(confirmableCount({ player_count: 6, guest_count: null })).toBe(6)
    expect(confirmableCount({ player_count: 1, guest_count: 3 })).toBe(0)
  })

  it('requires a final session with every confirmable player acknowledged', () => {
    expect(isVerified({ status: 'final', player_count: 4, guest_count: 1, ack_count: 3 })).toBe(true)
    expect(isVerified({ status: 'final', player_count: 4, guest_count: 1, ack_count: 2 })).toBe(false)
    expect(isVerified({ status: 'live', player_count: 4, guest_count: 0, ack_count: 4 })).toBe(false)
    expect(isVerified({ status: 'disputed', player_count: 4, guest_count: 0, ack_count: 4 })).toBe(false)
  })

  it('is not verified for an all-guest session', () => {
    expect(isVerified({ status: 'final', player_count: 3, guest_count: 3, ack_count: 0 })).toBe(false)
  })
})

describe('computeTotals', () => {
  it('balances when cash-outs equal buy-ins', () => {
    expect(
      computeTotals([
        { buy_in_cents: 2000, cash_out_cents: 3500 },
        { buy_in_cents: 2000, cash_out_cents: 500 },
      ])
    ).toEqual({ buyIn: 4000, cashOut: 4000, discrepancy: 0, missingCashOuts: 0 })
  })

  it('reports money missing from the table as a negative discrepancy', () => {
    const t = computeTotals([
      { buy_in_cents: 2000, cash_out_cents: 3000 },
      { buy_in_cents: 2000, cash_out_cents: 500 },
    ])
    expect(t.discrepancy).toBe(-500)
  })

  it('counts rows without a cash-out and treats them as zero', () => {
    const t = computeTotals([
      { buy_in_cents: 2000, cash_out_cents: null },
      { buy_in_cents: 2000, cash_out_cents: 1000 },
    ])
    expect(t.missingCashOuts).toBe(1)
    expect(t.cashOut).toBe(1000)
    expect(t.discrepancy).toBe(-3000)
  })

  it('compares payouts to the prize pool when one is set', () => {
    const rows = [
      { buy_in_cents: 1000, cash_out_cents: 7000 },
      { buy_in_cents: 1000, cash_out_cents: 3000 },
    ]
    // Sponsored tournament: $20 collected, $100 paid out of a $100 pool
    expect(computeTotals(rows, 10000).discrepancy).toBe(0)
    expect(computeTotals(rows).discrepancy).toBe(8000)
  })

  it('is all zeros for an empty ledger', () => {
    expect(computeTotals([])).toEqual({ buyIn: 0, cashOut: 0, discrepancy: 0, missingCashOuts: 0 })
  })
})

describe('sessionTitle', () => {
  const base = { title: null, kind: 'cash' as const, stakes: null, variant: null, is_official: false }

  it('prefers an explicit title', () => {
    expect(sessionTitle({ ...base, title: 'Friday game', stakes: '$1/$2' })).toBe('Friday game')
  })

  it('names official tournaments after the term they are scheduled in', () => {
    expect(
      sessionTitle({
        ...base,
        kind: 'tournament',
        is_official: true,
        scheduled_for: '2026-10-10T02:00:00Z',
        played_at: '2026-04-10T02:00:00Z',
      })
    ).toBe('Fall 2026 Caltech Poker Tournament')
  })

  it('falls back to played_at for official tournaments without a schedule', () => {
    expect(
      sessionTitle({ ...base, kind: 'tournament', is_official: true, scheduled_for: null, played_at: '2026-04-10T02:00:00Z' })
    ).toBe('Spring 2026 Caltech Poker Tournament')
  })

  it('uses stakes and variant when there is no title', () => {
    expect(sessionTitle({ ...base, stakes: '$0.25/$0.50', variant: 'NLHE' })).toBe('$0.25/$0.50 NLHE')
    expect(sessionTitle({ ...base, variant: 'PLO' })).toBe('PLO')
  })

  it('falls back to the kind', () => {
    expect(sessionTitle(base)).toBe('Cash game')
    expect(sessionTitle({ ...base, kind: 'tournament' })).toBe('Tournament')
  })
})

describe('groupAwards', () => {
  const players = new Map<string, PlayerRef>([
    ['alice', player('alice', 'Alice')],
    ['bob', player('bob', 'Bob')],
    ['cara', player('cara', 'Cara')],
  ])
  const award = (awards: ReturnType<typeof groupAwards>, key: string) => {
    const a = awards.find((x) => x.key === key)
    if (!a) throw new Error(`missing award ${key}`)
    return a
  }

  it('returns every award with no holder when there is no data', () => {
    const awards = groupAwards({ entries: [], sessions: [], players })
    expect(awards.map((a) => a.key)).toEqual([
      'whale',
      'shark',
      'grinder',
      'heater',
      'biggest_night',
      'reload_king',
      'bubble_boy',
      'champ',
      'most_generous',
    ])
    expect(awards.every((a) => a.holder === null && a.valueLabel === '—')).toBe(true)
  })

  it('hands out the per-player awards', () => {
    const entries = [
      // Alice: 2 sessions, staked $100, net +$60, 1 rebuy, on a 2-win streak
      entry({ user_id: 'alice', session_id: 's1', day: 1, buy_in_cents: 5000, net: 2000, rebuy_count: 1 }),
      entry({ user_id: 'alice', session_id: 's2', day: 2, buy_in_cents: 5000, net: 4000 }),
      // Bob: 3 sessions, staked $60, net −$50, 4 rebuys
      entry({ user_id: 'bob', session_id: 's1', day: 1, buy_in_cents: 2000, net: -2000, rebuy_count: 4 }),
      entry({ user_id: 'bob', session_id: 's2', day: 2, buy_in_cents: 2000, net: -2000 }),
      entry({ user_id: 'bob', session_id: 's3', day: 3, buy_in_cents: 2000, net: -1000 }),
      // Cara: 1 session, staked $10, net +$10
      entry({ user_id: 'cara', session_id: 's3', day: 3, buy_in_cents: 1000, net: 1000 }),
    ]
    const awards = groupAwards({ entries, sessions: [], players, sharkMinSessions: 2 })

    expect(award(awards, 'whale').holder?.id).toBe('alice')
    expect(award(awards, 'whale').valueLabel).toBe('$100')
    expect(award(awards, 'grinder').holder?.id).toBe('bob')
    expect(award(awards, 'grinder').valueLabel).toBe('3 sessions')
    expect(award(awards, 'heater').holder?.id).toBe('alice')
    expect(award(awards, 'heater').valueLabel).toBe('2 in a row')
    expect(award(awards, 'reload_king').holder?.id).toBe('bob')
    expect(award(awards, 'reload_king').valueLabel).toBe('4 reloads')
    expect(award(awards, 'most_generous').holder?.id).toBe('bob')
    expect(award(awards, 'most_generous').valueLabel).toBe('−$50')
  })

  it('Shark ignores players below the session minimum', () => {
    const entries = [
      // Cara has a 100% ROI but only one session
      entry({ user_id: 'cara', day: 1, buy_in_cents: 1000, net: 1000 }),
      // Alice has a 60% ROI over two
      entry({ user_id: 'alice', day: 1, buy_in_cents: 5000, net: 2000 }),
      entry({ user_id: 'alice', day: 2, buy_in_cents: 5000, net: 4000 }),
    ]
    const shark = award(groupAwards({ entries, sessions: [], players, sharkMinSessions: 2 }), 'shark')
    expect(shark.holder?.id).toBe('alice')
    expect(shark.valueLabel).toBe('+60%')

    const nobody = award(groupAwards({ entries, sessions: [], players, sharkMinSessions: 5 }), 'shark')
    expect(nobody.holder).toBeNull()
  })

  it('Most Generous goes to nobody when everyone is up or even', () => {
    const entries = [entry({ user_id: 'alice', net: 100 }), entry({ user_id: 'bob', net: 0 })]
    expect(award(groupAwards({ entries, sessions: [], players }), 'most_generous').holder).toBeNull()
  })

  it('never gives an award to a guest without an account', () => {
    const entries = [
      // The guest out-stakes, out-plays and out-rebuys everyone
      entry({ user_id: null, guest_id: 'g1', session_id: 's1', day: 1, buy_in_cents: 90000, net: -90000, rebuy_count: 9 }),
      entry({ user_id: null, guest_id: 'g1', session_id: 's2', day: 2, buy_in_cents: 90000, net: -90000 }),
      entry({ user_id: 'alice', session_id: 's1', day: 1, buy_in_cents: 2000, net: -500, rebuy_count: 1 }),
    ]
    const awards = groupAwards({ entries, sessions: [], players })
    for (const key of ['whale', 'grinder', 'reload_king', 'most_generous']) {
      expect(award(awards, key).holder?.id).toBe('alice')
    }
  })

  it('Bubble Boy is whoever finished one place outside the money', () => {
    const t = (user_id: string, place: number, cashOut: number) =>
      entry({ user_id, session_id: 't1', kind: 'tournament', buy_in_cents: 1000, cash_out_cents: cashOut, net_cents: cashOut - 1000, finish_place: place })
    const entries = [t('alice', 1, 2000), t('bob', 2, 1000), t('cara', 3, 0)]
    const awards = groupAwards({ entries, sessions: [], players })
    expect(award(awards, 'bubble_boy').holder?.id).toBe('cara')
    expect(award(awards, 'bubble_boy').valueLabel).toBe('1× bubbled')
    expect(award(awards, 'champ').holder?.id).toBe('alice')
    expect(award(awards, 'champ').valueLabel).toBe('1 title')
  })

  it('has no Bubble Boy when a tournament paid nobody', () => {
    const entries = [
      entry({ user_id: 'alice', session_id: 't1', kind: 'tournament', cash_out_cents: 0, net_cents: -2000, finish_place: 1 }),
      entry({ user_id: 'bob', session_id: 't1', kind: 'tournament', cash_out_cents: 0, net_cents: -2000, finish_place: 2 }),
    ]
    expect(award(groupAwards({ entries, sessions: [], players }), 'bubble_boy').holder).toBeNull()
  })

  it('Biggest Night is the session with the most money in', () => {
    const session = (id: string, total: number, count: number) => ({
      id,
      kind: 'cash' as const,
      title: null,
      stakes: '$1/$2',
      variant: 'NLHE',
      is_official: false,
      played_at: '2026-10-01T03:00:00Z',
      total_buy_in_cents: total,
      player_count: count,
    })
    const night = award(
      groupAwards({ entries: [], sessions: [session('small', 8000, 4), session('big', 45000, 7), session('free', 0, 9)], players }),
      'biggest_night'
    )
    expect(night.sessionId).toBe('big')
    expect(night.sessionTitle).toBe('$1/$2 NLHE')
    expect(night.valueLabel).toBe('$450 · 7 players')
    expect(night.holder).toBeNull()
  })
})

describe('tablemates', () => {
  const players = new Map<string, PlayerRef>([
    ['bob', player('bob', 'Bob')],
    ['cara', player('cara', 'Cara')],
  ])

  const entries = [
    // s1: alice, bob, cara
    entry({ user_id: 'alice', session_id: 's1', net: 1000 }),
    entry({ user_id: 'bob', session_id: 's1', net: -400 }),
    entry({ user_id: 'cara', session_id: 's1', net: -600 }),
    // s2: alice, bob, a guest
    entry({ user_id: 'alice', session_id: 's2', net: -500 }),
    entry({ user_id: 'bob', session_id: 's2', net: 300 }),
    entry({ user_id: null, guest_id: 'g1', session_id: 's2', net: 200 }),
    // s3: bob and cara without alice
    entry({ user_id: 'bob', session_id: 's3', net: 5000 }),
    entry({ user_id: 'cara', session_id: 's3', net: -5000 }),
  ]

  it('ranks by shared sessions and sums both sides over those sessions only', () => {
    expect(tablemates('alice', entries, players)).toEqual([
      { user: players.get('bob'), sharedSessions: 2, myNetCents: 500, theirNetCents: -100 },
      { user: players.get('cara'), sharedSessions: 1, myNetCents: 1000, theirNetCents: -600 },
    ])
  })

  it('leaves out guests and the player themself', () => {
    const ids = tablemates('alice', entries, players).map((t) => t.user.id)
    expect(ids).not.toContain('alice')
    expect(ids).toHaveLength(2)
  })

  it('respects the limit', () => {
    expect(tablemates('alice', entries, players, 1).map((t) => t.user.id)).toEqual(['bob'])
  })

  it('labels a player missing from the lookup as Unknown', () => {
    const [first] = tablemates('alice', entries, new Map())
    expect(first.user).toEqual({ id: 'bob', display_name: 'Unknown', profile_image_url: null })
  })

  it('is empty for someone who has not played', () => {
    expect(tablemates('nobody', entries, players)).toEqual([])
  })
})

describe('placeLabel', () => {
  it('formats a place or a dash', () => {
    expect(placeLabel(1)).toBe('1st')
    expect(placeLabel(12)).toBe('12th')
    expect(placeLabel(null)).toBe('—')
  })
})
