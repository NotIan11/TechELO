/** Small wording helpers for the poker pages: counts as words, and a session's ledger state in plain words. Pure and client-safe. */

import { confirmableCount } from './stats'
import type { PokerSessionKind, PokerSessionStatus } from './types'

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']

/** `3` → `three`, `13` → `13`. Pass `capital` for the start of a sentence. */
export function numberWord(n: number, capital = false): string {
  const w = Number.isInteger(n) && n >= 0 && n < WORDS.length ? WORDS[n] : String(n)
  return capital ? w.charAt(0).toUpperCase() + w.slice(1) : w
}

/** `plural(2, 'night')` → `nights` */
export function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
  return n === 1 ? singular : pluralForm
}

export function firstName(name: string | null | undefined): string {
  const first = (name ?? '').trim().split(/\s+/)[0]
  return first || 'Someone'
}

export type LedgerTone = 'mute' | 'warn' | 'loss'

export interface LedgerState {
  text: string
  tone: LedgerTone
  /** Voided rows are shown dimmed */
  dim: boolean
}

export interface LedgerStateInput {
  status: PokerSessionStatus
  kind: PokerSessionKind
  host_id: string
  player_count: number
  guest_count?: number | null
  ack_count: number
  entries: {
    user_id: string | null
    cash_out_cents: number | null
    acknowledged_at?: string | null
    disputed_at?: string | null
    user?: { display_name: string } | null
    guest?: { name: string } | null
  }[]
}

/** The state of a session's ledger in words, from one viewer's point of view. */
export function ledgerState(s: LedgerStateInput, viewerId: string | null): LedgerState {
  switch (s.status) {
    case 'scheduled':
      return { text: 'Upcoming', tone: 'mute', dim: false }
    case 'live': {
      if (s.kind === 'cash') {
        const playing = s.entries.filter((e) => e.cash_out_cents == null).length
        return { text: playing > 0 ? `Open, ${playing} still playing` : 'Open', tone: 'loss', dim: false }
      }
      return { text: 'Cards in the air', tone: 'loss', dim: false }
    }
    case 'voided':
      return { text: 'Voided by the host', tone: 'mute', dim: true }
    case 'disputed': {
      const d = s.entries.find((e) => e.disputed_at != null)
      if (d && viewerId && d.user_id === viewerId) return { text: 'Disputed by you', tone: 'loss', dim: false }
      const who = d?.user?.display_name ?? d?.guest?.name ?? null
      return { text: who ? `Disputed by ${firstName(who)}` : 'Disputed', tone: 'loss', dim: false }
    }
    default: {
      const total = confirmableCount(s)
      if (total === 0) return { text: 'Logged', tone: 'mute', dim: false }
      if (s.ack_count >= total) return { text: 'Confirmed', tone: 'mute', dim: false }
      const mine = viewerId ? s.entries.find((e) => e.user_id === viewerId) : null
      if (mine && mine.acknowledged_at === null && mine.disputed_at == null && s.host_id !== viewerId) {
        return { text: 'Waiting on you', tone: 'warn', dim: false }
      }
      return { text: `${s.ack_count} of ${total} confirmed`, tone: 'warn', dim: false }
    }
  }
}

export const LEDGER_TONE_CLASS: Record<LedgerTone, string> = {
  mute: 'text-mute',
  warn: 'text-warn',
  loss: 'text-loss',
}
