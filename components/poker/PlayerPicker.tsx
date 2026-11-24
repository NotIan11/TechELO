'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { chipClass } from '@/components/ui/ChipSelect'
import HouseChip from '@/components/ui/HouseChip'
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
    cn('flex min-h-[56px] w-full items-center gap-3 border-b border-line py-2 text-left transition', added ? 'opacity-50' : 'hover:border-line-bright')

  return (
    <div className="space-y-5">
      {recentAvailable.length > 0 && (
        <div>
          <p className="mb-2 text-[13px] text-mute">Recent tablemates</p>
          <div className="flex flex-wrap gap-2">
            {recentAvailable.map((p) => (
              <button key={p.id} type="button" disabled={disabled} onClick={() => onAdd(p)} className={cn(chipClass(false), 'disabled:opacity-50')}>
                {p.display_name}
                {p.guest && <span className="text-xs text-mute">guest</span>}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <label htmlFor="player-search" className="mb-2 block text-[13px] text-mute">
          Find a player, or type a new name to seat a guest
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
          placeholder="Name or house"
          className="input"
          autoComplete="off"
        />
        {q !== '' && (
          <ul className="mt-2 max-h-[50dvh] overflow-y-auto border-t border-line-strong lg:max-h-72">
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
                    <span className="flex min-w-0 flex-1 items-baseline gap-2.5">
                      <span className="truncate text-[15px] text-white">{p.display_name}</span>
                      <HouseChip name={p.dorm_name} />
                    </span>
                    <span className={cn('shrink-0 text-[13px]', added ? 'text-mute' : 'text-orange-400')}>{added ? 'Seated' : 'Add'}</span>
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
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2.5">
                        <span className="truncate text-[15px] text-white">{g.name}</span>
                        <span className="text-xs text-mute">guest</span>
                      </span>
                      <span className="block text-xs text-mute">No account yet{g.added_by ? ` · added by ${g.added_by}` : ''}</span>
                    </span>
                    <span className={cn('shrink-0 text-[13px]', added ? 'text-mute' : 'text-orange-400')}>{added ? 'Seated' : 'Add'}</span>
                  </button>
                </li>
              )
            })}
            <li>
              <button type="button" disabled={disabled || addingGuest || !guestName} onClick={() => void addGuest()} className={rowClass(false)}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] text-white">Add “{guestName}” as a guest</span>
                  <span className="block text-xs text-mute">
                    {results.users.length === 0 && results.guests.length === 0 ? 'Nobody by that name is on the site. ' : ''}
                    Link their account later; their sessions move with them.
                  </span>
                </span>
                <span className="shrink-0 text-[13px] text-orange-400">{addingGuest ? 'Adding…' : 'Add guest'}</span>
              </button>
            </li>
          </ul>
        )}
      </div>
      <p className="text-xs text-mute">
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
