'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Banner from '@/components/ui/Banner'
import Button from '@/components/ui/Button'
import { chipClass } from '@/components/ui/ChipSelect'
import ConfirmStrip from '@/components/ui/ConfirmStrip'
import EmptyState from '@/components/ui/EmptyState'
import HouseChip from '@/components/ui/HouseChip'
import MoneyDelta from '@/components/ui/MoneyDelta'
import { MAX_GUEST_NAME_LENGTH } from '@/lib/poker/constants'
import { suggestMatches } from '@/lib/poker/guests'
import { formatPokerDateTime } from '@/lib/poker/periods'
import { numberWord, plural } from '@/lib/poker/phrases'
import type { GuestSummary } from '@/lib/poker/queries'
import type { PlayerRefWithHouse } from '@/lib/poker/types'
import { cn } from '@/lib/utils'

interface GuestsClientProps {
  guests: GuestSummary[]
  players: PlayerRefWithHouse[]
  currentUserId: string
  isOfficer: boolean
}

type Panel = { id: string; mode: 'link' | 'rename' | 'remove' | 'unlink'; preset?: PlayerRefWithHouse | null }

function sessionsLabel(n: number): string {
  return `${n} logged session${n === 1 ? '' : 's'}`
}

function nightsPhrase(n: number): string {
  return n === 0 ? 'No nights move yet' : `${numberWord(n, true)} ${plural(n, 'night')} ${n === 1 ? 'moves' : 'move'} to their record and they are asked to confirm ${n === 1 ? 'it' : 'each one'}`
}

const GRID = 'md:grid md:grid-cols-[minmax(0,1.1fr)_64px_92px_124px_minmax(0,1.6fr)] md:items-center md:gap-x-5'
const ROW_ACTION = 'inline-flex min-h-[44px] items-center text-[13px] transition disabled:opacity-50'
const PANEL_STRIP = 'mt-0 border-0 p-0 pb-5'

function shortDate(iso: string | null): string {
  return iso ? formatPokerDateTime(iso, false) : '—'
}

export default function GuestsClient({ guests, players, currentUserId, isOfficer }: GuestsClientProps) {
  const router = useRouter()
  const [panel, setPanel] = useState<Panel | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const unlinked = guests.filter((g) => !g.linked_user_id)
  const linked = guests.filter((g) => g.linked_user_id)

  const post = async (endpoint: string, body: unknown, success: string) => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setNotice(success)
      setPanel(null)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const open = (id: string, mode: Panel['mode'], preset: PlayerRefWithHouse | null = null) => {
    setError('')
    setNotice('')
    setPanel({ id, mode, preset })
  }

  const [copiedFor, setCopiedFor] = useState<string | null>(null)
  const copyInvite = async (id: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/signup`)
      setCopiedFor(id)
      setTimeout(() => setCopiedFor(null), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

  /** Best guess at who each waiting guest is, from the names already on the site */
  const guesses = useMemo(() => {
    const out = new Map<string, PlayerRefWithHouse[]>()
    for (const g of unlinked) out.set(g.id, suggestMatches(g.name, players, 3))
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guests, players])

  if (guests.length === 0) {
    return (
      <div className="mt-8">
        <EmptyState
          title="No guests yet"
          description="When someone at the table has no account, type their name in the player search on a live ledger and add them as a guest. They show up here so you can link them later."
          action={
            <Button href="/play" variant="outline">
              Open a table
            </Button>
          }
        />
      </div>
    )
  }

  const stats = (g: GuestSummary) => (
    <>
      <span className="tabular hidden text-right text-sm text-zinc-400 md:block">{g.sessions_played}</span>
      <span className="hidden text-right md:block">{g.sessions_played > 0 ? <MoneyDelta cents={g.net_cents} compact /> : <span className="tabular text-sm text-zinc-600">—</span>}</span>
    </>
  )
  const mobileStats = (g: GuestSummary, dateLabel: string, date: string | null) => (
    <span className="tabular mt-0.5 block text-xs text-mute md:hidden">
      {g.sessions_played} {plural(g.sessions_played, 'night')}
      {g.sessions_played > 0 && (
        <>
          {' · '}
          <MoneyDelta cents={g.net_cents} size="xs" compact />
        </>
      )}
      {date && ` · ${dateLabel} ${shortDate(date)}`}
    </span>
  )

  return (
    <div>
      {(notice || error) && (
        <div className="mt-6 space-y-2">
          {notice && <Banner tone="success">{notice}</Banner>}
          {error && <Banner tone="error">{error}</Banner>}
        </div>
      )}

      {/* Waiting for an account */}
      <div className={cn('pb-2.5 pt-3.5 text-xs text-mute', GRID)}>
        <h2 className="font-sans text-xs tracking-normal text-mute">Waiting for an account</h2>
        <span className="hidden text-right md:block">Nights</span>
        <span className="hidden text-right md:block">Net</span>
        <span className="hidden md:block">Last played</span>
        <span className="hidden md:block">Probably</span>
      </div>
      <div className="border-t border-line-strong">
        {unlinked.length === 0 ? (
          <p className="border-b border-line py-4 text-sm text-mute">Every guest is linked to an account.</p>
        ) : (
          unlinked.map((g) => {
            const mine = g.created_by === currentUserId
            const active = panel?.id === g.id ? panel.mode : null
            const guess = guesses.get(g.id)?.[0] ?? null
            return (
              <div key={g.id} className={cn(active ? '-mt-px border-y border-line-bright' : 'border-b border-line')}>
                <div className={cn('min-h-[56px] py-2.5 md:py-0', GRID)}>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-baseline gap-x-2.5">
                      <span className="truncate text-[15px] text-white">{g.name}</span>
                      {!mine && g.added_by && <span className="text-xs text-mute">added by {g.added_by.display_name}</span>}
                    </p>
                    {mobileStats(g, 'last', g.last_played_at)}
                  </div>
                  {stats(g)}
                  <span className="tabular hidden text-xs text-mute md:block">{shortDate(g.last_played_at)}</span>
                  <div className="flex flex-wrap items-center justify-between gap-x-4">
                    <span className={cn('min-w-0 truncate text-sm', guess ? 'text-zinc-300' : 'text-mute')}>
                      {guess ? (
                        <>
                          <span className="md:hidden">Probably </span>
                          {guess.display_name}
                          {guess.dorm_name && ` · ${guess.dorm_name}`}
                        </>
                      ) : (
                        'Nobody by that name yet'
                      )}
                    </span>
                    {!active && (
                      <span className="flex flex-wrap gap-x-4">
                        <button type="button" className={cn(ROW_ACTION, 'link')} disabled={busy} onClick={() => open(g.id, 'link', guess)}>
                          {guess ? 'Link' : 'Find them'}
                        </button>
                        {!guess && (
                          <button type="button" className={cn(ROW_ACTION, 'link')} onClick={() => void copyInvite(g.id)}>
                            {copiedFor === g.id ? 'Link copied' : 'Copy invite link'}
                          </button>
                        )}
                        <button type="button" className={cn(ROW_ACTION, 'text-zinc-400 hover:text-white')} disabled={busy} onClick={() => open(g.id, 'rename')}>
                          Rename
                        </button>
                        {g.entry_count === 0 && (
                          <button type="button" className={cn(ROW_ACTION, 'text-zinc-400 hover:text-loss')} disabled={busy} onClick={() => open(g.id, 'remove')}>
                            Remove
                          </button>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {active === 'link' && (
                  <LinkPanel
                    guest={g}
                    players={players}
                    suggestions={guesses.get(g.id) ?? []}
                    preset={panel?.preset ?? null}
                    busy={busy}
                    onLink={(p) =>
                      post(
                        '/api/poker/guests/link',
                        { guest_id: g.id, user_id: p.id },
                        `${g.name} is now ${p.display_name}. ${sessionsLabel(g.sessions_played)} moved to their record.`
                      )
                    }
                    onBack={() => setPanel(null)}
                  />
                )}
                {active === 'rename' && (
                  <RenamePanel name={g.name} busy={busy} onSave={(name) => post('/api/poker/guests/upsert', { id: g.id, name }, 'Guest renamed.')} onBack={() => setPanel(null)} />
                )}
                {active === 'remove' && (
                  <ConfirmStrip
                    inline
                    tone="danger"
                    text={`Remove ${g.name}? They are not on any ledger.`}
                    confirmLabel="Remove"
                    busy={busy}
                    onConfirm={() => post('/api/poker/guests/delete', { id: g.id }, 'Guest removed.')}
                    onBack={() => setPanel(null)}
                    className={PANEL_STRIP}
                  />
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Linked */}
      {linked.length > 0 && (
        <>
          <div className={cn('mt-12 pb-2.5 text-xs text-mute', GRID)}>
            <h2 className="font-sans text-xs tracking-normal text-mute">Linked</h2>
            <span className="hidden text-right md:block">Nights</span>
            <span className="hidden text-right md:block">Net</span>
            <span className="hidden md:block">Linked on</span>
            <span className="hidden md:block">Seated as</span>
          </div>
          <div className="border-t border-line-strong">
            {linked.map((g) => {
              const active = panel?.id === g.id ? panel.mode : null
              return (
                <div key={g.id} className={cn(active ? '-mt-px border-y border-line-bright' : 'border-b border-line')}>
                  <div className={cn('min-h-[56px] py-2.5 md:py-0', GRID)}>
                    <div className="min-w-0">
                      {g.linked_user ? (
                        <Link href={`/profile/${g.linked_user.id}`} className="truncate text-[15px] text-white underline-offset-4 hover:underline">
                          {g.linked_user.display_name}
                        </Link>
                      ) : (
                        <span className="text-[15px] text-white">Unknown</span>
                      )}
                      {mobileStats(g, 'linked', g.linked_at)}
                    </div>
                    {stats(g)}
                    <span className="tabular hidden text-xs text-mute md:block">{shortDate(g.linked_at)}</span>
                    <div className="flex items-center justify-between gap-x-4">
                      <span className="min-w-0 truncate text-sm text-mute">
                        <span className="md:hidden">Seated as </span>“{g.name}”
                        {!(g.created_by === currentUserId) && g.added_by && <> · added by {g.added_by.display_name}</>}
                      </span>
                      {!active && (isOfficer || g.created_by === currentUserId) && (
                        <button type="button" className={cn(ROW_ACTION, 'text-zinc-400 hover:text-white')} disabled={busy} onClick={() => open(g.id, 'unlink')}>
                          Unlink
                        </button>
                      )}
                    </div>
                  </div>
                  {active === 'unlink' && (
                    <ConfirmStrip
                      tone="danger"
                      text={`Unlink ${g.name} from ${g.linked_user?.display_name ?? 'this account'}? ${sessionsLabel(g.sessions_played)} go back to guest rows and stop counting toward their record.`}
                      confirmLabel="Unlink"
                      busy={busy}
                      onConfirm={() => post('/api/poker/guests/unlink', { guest_id: g.id }, 'Guest unlinked.')}
                      onBack={() => setPanel(null)}
                      className={PANEL_STRIP}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      <p className="mt-7 text-[13px] text-mute">To seat a guest, type a name that is not on the site into the player search at a live table.</p>
    </div>
  )
}

function LinkPanel({
  guest,
  players,
  suggestions,
  preset,
  busy,
  onLink,
  onBack,
}: {
  guest: GuestSummary
  players: PlayerRefWithHouse[]
  suggestions: PlayerRefWithHouse[]
  /** The row's best guess, offered first */
  preset: PlayerRefWithHouse | null
  busy: boolean
  onLink: (player: PlayerRefWithHouse) => void
  onBack: () => void
}) {
  const [query, setQuery] = useState('')
  const [choice, setChoice] = useState<PlayerRefWithHouse | null>(preset)
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return players
      .filter((p) => p.display_name.toLowerCase().includes(q) || (p.dorm_name ?? '').toLowerCase().includes(q))
      .slice(0, 8)
  }, [players, query])

  if (choice) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 pt-1">
        <p className="max-w-[620px] text-sm text-zinc-300">
          Link <span className="text-white">{guest.name}</span> to <span className="text-white">{choice.display_name}</span>? {nightsPhrase(guest.sessions_played)}.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => onLink(choice)} disabled={busy} type="button">
            {busy ? 'Linking…' : 'Link them'}
          </Button>
          <Button variant="secondary" onClick={() => setChoice(null)} disabled={busy} type="button">
            Someone else
          </Button>
          <Button variant="ghost" onClick={onBack} disabled={busy} type="button">
            Not now
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-5 pt-1 md:max-w-xl">
      {suggestions.length > 0 && (
        <div>
          <p className="mb-2 text-[13px] text-mute">Could be</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((p) => (
              <button key={p.id} type="button" disabled={busy} onClick={() => setChoice(p)} className={chipClass(false)}>
                {p.display_name}
                {p.dorm_name && <span className="text-xs text-mute">{p.dorm_name}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <label htmlFor={`link-search-${guest.id}`} className="mb-2 block text-[13px] text-mute">
          Find {guest.name}’s account
        </label>
        <input
          id={`link-search-${guest.id}`}
          type="search"
          className="input"
          placeholder="Name or house"
          value={query}
          autoFocus
          autoComplete="off"
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {query.trim() !== '' &&
        (results.length === 0 ? (
          <p className="text-sm text-mute">No players match “{query}”. They may not have signed up yet.</p>
        ) : (
          <ul className="border-t border-line-strong">
            {results.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setChoice(p)}
                  className="flex min-h-[52px] w-full items-center gap-3 border-b border-line py-2 text-left transition hover:border-line-bright"
                >
                  <span className="flex min-w-0 flex-1 items-baseline gap-2.5">
                    <span className="truncate text-[15px] text-white">{p.display_name}</span>
                    <HouseChip name={p.dorm_name} />
                  </span>
                  <span className="shrink-0 text-[13px] text-orange-400">Link</span>
                </button>
              </li>
            ))}
          </ul>
        ))}
      <Button variant="ghost" onClick={onBack} disabled={busy} type="button" className="-ml-4">
        Not now
      </Button>
    </div>
  )
}

function RenamePanel({ name, busy, onSave, onBack }: { name: string; busy: boolean; onSave: (name: string) => void; onBack: () => void }) {
  const [value, setValue] = useState(name)
  const trimmed = value.trim()
  return (
    <form
      className="flex flex-wrap items-center gap-2 pb-5 pt-1"
      onSubmit={(e) => {
        e.preventDefault()
        if (trimmed) onSave(trimmed)
      }}
    >
      <input type="text" className="input w-full sm:w-64" value={value} maxLength={MAX_GUEST_NAME_LENGTH} autoFocus onChange={(e) => setValue(e.target.value)} aria-label="Guest name" />
      <Button variant="outline" type="submit" disabled={busy || !trimmed || trimmed === name}>
        {busy ? 'Saving…' : 'Save'}
      </Button>
      <Button variant="ghost" onClick={onBack} disabled={busy} type="button">
        Cancel
      </Button>
    </form>
  )
}
