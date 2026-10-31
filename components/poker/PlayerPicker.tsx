'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import { chipClass } from '@/components/ui/ChipSelect'
import HouseChip from '@/components/ui/HouseChip'
import Icon from '@/components/ui/Icon'
import TextLink from '@/components/ui/TextLink'
import { guestAsPlayer } from '@/lib/poker/guests'
import { MAX_GUEST_NAME_LENGTH } from '@/lib/poker/constants'
import type { GuestRef, PlayerRefWithHouse } from '@/lib/poker/types'

interface PlayerPickerProps {
  players: PlayerRefWithHouse[]
  /** Guests without an account yet (any host's) */
  guests: GuestRef[]
  recent: PlayerRefWithHouse[]
  selectedIds: Set<string>
  onAdd: (player: PlayerRefWithHouse) => void
  /** Create a new guest with this name and seat them; resolves false if it failed (the typed name is kept) */
  onAddGuest: (name: string) => Promise<boolean>
  disabled?: boolean
}

/** Recent-tablemate chips + a search box over every registered user and existing guest, with "add as a guest" as the fallback */
export default function PlayerPicker({ players, guests, recent, selectedIds, onAdd, onAddGuest, disabled }: PlayerPickerProps) {
  const [query, setQuery] = useState('')
  const [copied, setCopied] = useState(false)
  const [addingGuest, setAddingGuest] = useState(false)

  const recentAvailable = recent.filter((p) => !selectedIds.has(p.id))
  const q = query.trim()
  const results = useMemo(() => {
    const needle = q.toLowerCase()
    if (!needle) return { users: [] as PlayerRefWithHouse[], guests: [] as GuestRef[] }
    return {
      users: players
        .filter((p) => p.display_name.toLowerCase().includes(needle) || (p.dorm_name ?? '').toLowerCase().includes(needle))
        .slice(0, 20),
      guests: guests.filter((g) => g.name.toLowerCase().includes(needle)).slice(0, 10),
    }
  }, [players, guests, q])
  const guestName = q.replace(/\s+/g, ' ').slice(0, MAX_GUEST_NAME_LENGTH)

  const copySignup = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/signup`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

  const addGuest = async () => {
    if (!guestName || addingGuest) return
    setAddingGuest(true)
    try {
      if (await onAddGuest(guestName)) setQuery('')
    } finally {
      setAddingGuest(false)
    }
  }

  const rowClass = (added: boolean) =>
    cn('flex w-full items-center gap-3 px-4 py-2.5 text-left transition', added ? 'opacity-50' : 'hover:bg-ink-700')

  return (
    <div className="space-y-3">
      {recentAvailable.length > 0 && (
        <div>
          <p className="mb-2 eyebrow">Recent tablemates</p>
          <div className="flex flex-wrap gap-2">
            {recentAvailable.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={disabled}
                onClick={() => onAdd(p)}
                className={cn(chipClass(false), 'pl-1.5 disabled:opacity-50')}
              >
                <Avatar src={p.profile_image_url} name={p.display_name} size="xs" />
                <Icon name="plus" className="h-3.5 w-3.5 text-orange-400" strokeWidth={2} /> {p.display_name}
                {p.guest && <span className="text-zinc-500">guest</span>}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <label htmlFor="player-search" className="sr-only">
          Add players
        </label>
        <input
          id="player-search"
          type="search"
          value={query}
          disabled={disabled}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // Enter with no registered match seats the typed name as a guest
            if (e.key === 'Enter' && q && results.users.length === 0 && results.guests.length === 0) {
              e.preventDefault()
              void addGuest()
            }
          }}
          placeholder="Add players by name or house…"
          className="input"
          autoComplete="off"
        />
        {q !== '' && (
          <Card padding="none" className="mt-2 max-h-72 overflow-y-auto">
            <ul className="divide-y divide-line">
              {results.users.map((p) => {
                const added = selectedIds.has(p.id)
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      disabled={added || disabled}
                      onClick={() => {
                        onAdd(p)
                        setQuery('')
                      }}
                      className={rowClass(added)}
                    >
                      <Avatar src={p.profile_image_url} name={p.display_name} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-white">{p.display_name}</span>
                        <span className="mt-0.5 block">
                          <HouseChip name={p.dorm_name} />
                        </span>
                      </span>
                      <span className={cn('shrink-0 text-xs', added ? 'text-win' : 'text-orange-400')}>{added ? 'Added' : '+ Add'}</span>
                    </button>
                  </li>
                )
              })}
              {results.guests.map((g) => {
                const added = selectedIds.has(g.id)
                return (
                  <li key={g.id}>
                    <button
                      type="button"
                      disabled={added || disabled}
                      onClick={() => {
                        onAdd(guestAsPlayer(g))
                        setQuery('')
                      }}
                      className={rowClass(added)}
                    >
                      <Avatar name={g.name} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-white">{g.name}</span>
                          <Badge tone="neutral">Guest</Badge>
                        </span>
                        <span className="mt-0.5 block text-xs text-zinc-500">
                          No account yet{g.added_by ? ` · added by ${g.added_by}` : ''}
                        </span>
                      </span>
                      <span className={cn('shrink-0 text-xs', added ? 'text-win' : 'text-orange-400')}>{added ? 'Added' : '+ Add'}</span>
                    </button>
                  </li>
                )
              })}
              <li>
                <button type="button" disabled={disabled || addingGuest || !guestName} onClick={() => void addGuest()} className={rowClass(false)}>
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-line-strong text-zinc-400">
                    <Icon name="plus" className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-white">Add “{guestName}” as a guest</span>
                    <span className="block text-xs text-zinc-500">
                      {results.users.length === 0 && results.guests.length === 0 ? 'Nobody by that name is on the site. ' : ''}
                      Link their account later; their sessions move with them.
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-orange-400">{addingGuest ? 'Adding…' : '+ Guest'}</span>
                </button>
              </li>
            </ul>
          </Card>
        )}
      </div>
      <p className="text-xs text-zinc-500">
        Someone not on the site yet? Type their name and add them as a guest.{' '}
        <TextLink href="/poker/guests" className="text-xs">
          Link accounts
        </TextLink>{' '}
        once they sign up, or{' '}
        <TextLink onClick={copySignup} className="text-xs">
          {copied ? 'signup link copied' : 'copy the signup link'}
        </TextLink>
        .
      </p>
    </div>
  )
}
