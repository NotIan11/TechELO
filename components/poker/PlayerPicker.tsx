'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'
import Card from '@/components/ui/Card'
import HouseChip from '@/components/ui/HouseChip'
import type { PlayerRefWithHouse } from '@/lib/poker/types'

interface PlayerPickerProps {
  players: PlayerRefWithHouse[]
  recent: PlayerRefWithHouse[]
  selectedIds: Set<string>
  onAdd: (player: PlayerRefWithHouse) => void
  disabled?: boolean
}

/** Recent-tablemate chips + a search box over every registered user */
export default function PlayerPicker({ players, recent, selectedIds, onAdd, disabled }: PlayerPickerProps) {
  const [query, setQuery] = useState('')
  const [copied, setCopied] = useState(false)

  const recentAvailable = recent.filter((p) => !selectedIds.has(p.id))
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return players
      .filter((p) => p.display_name.toLowerCase().includes(q) || (p.dorm_name ?? '').toLowerCase().includes(q))
      .slice(0, 20)
  }, [players, query])

  const copySignup = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/signup`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

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
                className="inline-flex min-h-[36px] items-center gap-2 rounded-full border border-line bg-ink-700 pl-1.5 pr-3 text-sm text-zinc-200 transition hover:bg-white/[0.1] hover:text-white disabled:opacity-50"
              >
                <Avatar src={p.profile_image_url} name={p.display_name} size="xs" />
                <span className="text-orange-400">+</span> {p.display_name}
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
          placeholder="Add players by name or house…"
          className="input"
          autoComplete="off"
        />
        {query.trim() !== '' && (
          <Card padding="none" className="mt-2 max-h-64 overflow-y-auto">
            {results.length === 0 ? (
              <p className="p-4 text-center text-sm text-zinc-500">No players match “{query}”.</p>
            ) : (
              <ul className="divide-y divide-line">
                {results.map((p) => {
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
                        className={cn(
                          'flex w-full items-center gap-3 px-4 py-2.5 text-left transition',
                          added ? 'opacity-50' : 'hover:bg-ink-700'
                        )}
                      >
                        <Avatar src={p.profile_image_url} name={p.display_name} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-white">{p.display_name}</span>
                          <span className="mt-0.5 block">
                            <HouseChip name={p.dorm_name} />
                          </span>
                        </span>
                        <span className={cn('shrink-0 text-xs', added ? 'text-win' : 'text-orange-400')}>
                          {added ? 'Added' : '+ Add'}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        )}
      </div>
      <p className="text-xs text-zinc-500">
        Someone not on the site yet?{' '}
        <button type="button" onClick={copySignup} className="text-orange-400 underline-offset-2 hover:underline">
          {copied ? 'Signup link copied' : 'Copy the signup link'}
        </button>{' '}
        — add them once they’ve registered.
      </p>
    </div>
  )
}
