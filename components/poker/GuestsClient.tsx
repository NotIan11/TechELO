'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import Banner from '@/components/ui/Banner'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { chipClass } from '@/components/ui/ChipSelect'
import ConfirmStrip from '@/components/ui/ConfirmStrip'
import EmptyState from '@/components/ui/EmptyState'
import HouseChip from '@/components/ui/HouseChip'
import MoneyDelta from '@/components/ui/MoneyDelta'
import SectionHeader from '@/components/ui/SectionHeader'
import PlayerName from './PlayerName'
import { MAX_GUEST_NAME_LENGTH } from '@/lib/poker/constants'
import { suggestMatches } from '@/lib/poker/guests'
import { formatPokerDateTime } from '@/lib/poker/periods'
import type { GuestSummary } from '@/lib/poker/queries'
import type { PlayerRefWithHouse } from '@/lib/poker/types'
import { cn } from '@/lib/utils'

interface GuestsClientProps {
  guests: GuestSummary[]
  players: PlayerRefWithHouse[]
  currentUserId: string
  isOfficer: boolean
}

type Panel = { id: string; mode: 'link' | 'rename' | 'remove' | 'unlink' }

function sessionsLabel(n: number): string {
  return `${n} logged session${n === 1 ? '' : 's'}`
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

  const open = (id: string, mode: Panel['mode']) => {
    setError('')
    setNotice('')
    setPanel({ id, mode })
  }

  if (guests.length === 0) {
    return (
      <EmptyState
        icon="users"
        title="No guests yet"
        description="When someone at the table has no account, type their name in the player search on a live ledger and add them as a guest. They show up here so you can link them later."
        action={<Button href="/poker/sessions/new">Start a game</Button>}
      />
    )
  }

  return (
    <div className="space-y-8">
      {notice && <Banner tone="success">{notice}</Banner>}
      {error && <Banner tone="error">{error}</Banner>}

      <section>
        <SectionHeader title={`Waiting for an account · ${unlinked.length}`} />
        {unlinked.length === 0 ? (
          <p className="text-sm text-zinc-500">Every guest is linked to an account.</p>
        ) : (
          <Card padding="none" className="overflow-hidden">
            <ul className="divide-y divide-line">
              {unlinked.map((g) => {
                const mine = g.created_by === currentUserId
                const active = panel?.id === g.id ? panel.mode : null
                return (
                  <li key={g.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={g.name} size="md" />
                        <div className="min-w-0">
                          <p className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold text-white">{g.name}</span>
                            <Badge tone="neutral">Guest</Badge>
                          </p>
                          <p className="tabular mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-zinc-500">
                            <span>{sessionsLabel(g.sessions_played)}</span>
                            {g.sessions_played > 0 && (
                              <>
                                <span>·</span>
                                <MoneyDelta cents={g.net_cents} size="xs" compact />
                              </>
                            )}
                            {g.last_played_at && <span>· last {formatPokerDateTime(g.last_played_at, false)}</span>}
                            {!mine && g.added_by && <span>· added by {g.added_by.display_name}</span>}
                          </p>
                        </div>
                      </div>
                      {!active && (
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => open(g.id, 'link')} disabled={busy} type="button">
                            Link account
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => open(g.id, 'rename')} disabled={busy} type="button">
                            Rename
                          </Button>
                          {g.entry_count === 0 && (
                            <Button size="sm" variant="ghost" onClick={() => open(g.id, 'remove')} disabled={busy} type="button">
                              Remove
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {active === 'link' && (
                      <LinkPanel
                        guest={g}
                        players={players}
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
                      <RenamePanel
                        name={g.name}
                        busy={busy}
                        onSave={(name) => post('/api/poker/guests/upsert', { id: g.id, name }, 'Guest renamed.')}
                        onBack={() => setPanel(null)}
                      />
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
                      />
                    )}
                  </li>
                )
              })}
            </ul>
          </Card>
        )}
      </section>

      {linked.length > 0 && (
        <section>
          <SectionHeader title={`Linked · ${linked.length}`} />
          <Card padding="none" className="overflow-hidden">
            <ul className="divide-y divide-line">
              {linked.map((g) => {
                const active = panel?.id === g.id ? panel.mode : null
                return (
                  <li key={g.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                        <PlayerName player={g.linked_user ? { ...g.linked_user, dorm_name: null } : null} size="md" />
                        <span className="text-xs text-zinc-500">
                          was “{g.name}” · {sessionsLabel(g.sessions_played)}
                          {g.linked_at && <> · linked {formatPokerDateTime(g.linked_at, false)}</>}
                          {!(g.created_by === currentUserId) && g.added_by && <> · added by {g.added_by.display_name}</>}
                        </span>
                      </div>
                      {!active && (isOfficer || g.created_by === currentUserId) && (
                        <Button size="sm" variant="ghost" onClick={() => open(g.id, 'unlink')} disabled={busy} type="button">
                          Unlink
                        </Button>
                      )}
                    </div>
                    {active === 'unlink' && (
                      <ConfirmStrip
                        tone="danger"
                        text={`Unlink ${g.name} from ${g.linked_user?.display_name ?? 'this account'}? ${sessionsLabel(g.sessions_played)} go back to guest rows and stop counting toward their record.`}
                        confirmLabel="Unlink"
                        busy={busy}
                        onConfirm={() => post('/api/poker/guests/unlink', { guest_id: g.id }, 'Guest unlinked.')}
                        onBack={() => setPanel(null)}
                      />
                    )}
                  </li>
                )
              })}
            </ul>
          </Card>
        </section>
      )}

      <p className="text-[13px] text-zinc-400">
        Add a guest from any live ledger: type a name in the player search and choose “Add as a guest”. Linking moves every session they played, and asks them to confirm each one.
      </p>
    </div>
  )
}

function LinkPanel({
  guest,
  players,
  busy,
  onLink,
  onBack,
}: {
  guest: GuestSummary
  players: PlayerRefWithHouse[]
  busy: boolean
  onLink: (player: PlayerRefWithHouse) => void
  onBack: () => void
}) {
  const [query, setQuery] = useState('')
  const [choice, setChoice] = useState<PlayerRefWithHouse | null>(null)
  const suggestions = useMemo(() => suggestMatches(guest.name, players, 3), [guest.name, players])
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return players
      .filter((p) => p.display_name.toLowerCase().includes(q) || (p.dorm_name ?? '').toLowerCase().includes(q))
      .slice(0, 8)
  }, [players, query])

  if (choice) {
    return (
      <ConfirmStrip
        text={
          <>
            Link <strong>{guest.name}</strong> to <strong>{choice.display_name}</strong>? {sessionsLabel(guest.sessions_played)} move to their record and they will be asked to
            confirm each one.
          </>
        }
        confirmLabel="Link account"
        busyLabel="Linking…"
        busy={busy}
        onConfirm={() => onLink(choice)}
        onBack={() => setChoice(null)}
      />
    )
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-line bg-ink-900 p-3">
      {suggestions.length > 0 && (
        <div>
          <p className="eyebrow mb-2">Could be</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((p) => (
              <button key={p.id} type="button" disabled={busy} onClick={() => setChoice(p)} className={cn(chipClass(false), 'pl-1.5')}>
                <Avatar src={p.profile_image_url} name={p.display_name} size="xs" />
                {p.display_name}
                {p.dorm_name && <span className="text-zinc-500">{p.dorm_name}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <label htmlFor={`link-search-${guest.id}`} className="sr-only">
          Search players
        </label>
        <input
          id={`link-search-${guest.id}`}
          type="search"
          className="input"
          placeholder="Search players by name or house…"
          value={query}
          autoFocus
          autoComplete="off"
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {query.trim() !== '' &&
        (results.length === 0 ? (
          <p className="text-sm text-zinc-500">No players match “{query}”. They may not have signed up yet.</p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
            {results.map((p) => (
              <li key={p.id}>
                <button type="button" disabled={busy} onClick={() => setChoice(p)} className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-ink-700">
                  <Avatar src={p.profile_image_url} name={p.display_name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-white">{p.display_name}</span>
                    <span className="mt-0.5 block">
                      <HouseChip name={p.dorm_name} />
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-orange-400">Link</span>
                </button>
              </li>
            ))}
          </ul>
        ))}
      <Button size="sm" variant="ghost" onClick={onBack} disabled={busy} type="button">
        Back
      </Button>
    </div>
  )
}

function RenamePanel({ name, busy, onSave, onBack }: { name: string; busy: boolean; onSave: (name: string) => void; onBack: () => void }) {
  const [value, setValue] = useState(name)
  const trimmed = value.trim()
  return (
    <form
      className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-ink-900 p-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (trimmed) onSave(trimmed)
      }}
    >
      <input type="text" className="input w-full sm:w-64" value={value} maxLength={MAX_GUEST_NAME_LENGTH} autoFocus onChange={(e) => setValue(e.target.value)} aria-label="Guest name" />
      <Button size="sm" type="submit" disabled={busy || !trimmed || trimmed === name}>
        {busy ? 'Saving…' : 'Save'}
      </Button>
      <Button size="sm" variant="ghost" onClick={onBack} disabled={busy} type="button">
        Cancel
      </Button>
    </form>
  )
}
