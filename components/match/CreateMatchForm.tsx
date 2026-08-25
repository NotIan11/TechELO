'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'
import Banner from '@/components/ui/Banner'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import GameIcon, { gameLabel } from '@/components/ui/GameIcon'
import HouseChip from '@/components/ui/HouseChip'
import Icon from '@/components/ui/Icon'

type GameType = 'pool' | 'ping_pong'

interface Opponent {
  id: string
  display_name: string
  profile_image_url: string | null
  dorm_name: string | null
  ratings: Record<string, number>
}

interface CreateMatchFormProps {
  opponents: Opponent[]
  myRatings: Record<string, number>
  initialOpponentId: string | null
  initialGameType: GameType
}

export default function CreateMatchForm({
  opponents,
  myRatings,
  initialOpponentId,
  initialGameType,
}: CreateMatchFormProps) {
  const [gameType, setGameType] = useState<GameType>(initialGameType)
  const [opponentId, setOpponentId] = useState(
    initialOpponentId && opponents.some((o) => o.id === initialOpponentId) ? initialOpponentId : ''
  )
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return opponents
    return opponents.filter(
      (o) =>
        o.display_name.toLowerCase().includes(q) ||
        (o.dorm_name ?? '').toLowerCase().includes(q)
    )
  }, [opponents, search])

  const selected = opponents.find((o) => o.id === opponentId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!opponentId) {
      setError('Pick an opponent first')
      return
    }
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/matches/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_type: gameType, player2_id: opponentId }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create match')
      }
      // Land on the match page, which shows the "waiting for opponent" state
      router.push(`/matches/${data.match.id}`)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Game selector */}
      <div>
        <p className="label">Game</p>
        <div className="grid grid-cols-2 gap-3">
          {(['pool', 'ping_pong'] as const).map((game) => {
            const active = gameType === game
            return (
              <button
                key={game}
                type="button"
                onClick={() => setGameType(game)}
                aria-pressed={active}
                className={cn(
                  'card flex flex-col items-center gap-2 p-5 transition',
                  active ? 'border-orange-500 bg-orange-500/10' : 'hover:border-line-strong'
                )}
              >
                <GameIcon game={game} size="xl" className="text-orange-400" />
                <span className="text-sm font-semibold text-white">{gameLabel(game)}</span>
                <span className="tabular text-xs text-zinc-500">
                  Your rating: {myRatings[game] ?? 1500}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Opponent picker */}
      <div>
        <label htmlFor="opponent-search" className="label">
          Opponent
        </label>
        <input
          id="opponent-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or house…"
          className="input mb-3"
        />
        <Card padding="none" className="max-h-80 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="p-5 text-center text-sm text-zinc-500">No players match “{search}”.</p>
          ) : (
            <ul className="divide-y divide-line">
              {filtered.map((opponent) => {
                const active = opponent.id === opponentId
                return (
                  <li key={opponent.id}>
                    <button
                      type="button"
                      onClick={() => setOpponentId(active ? '' : opponent.id)}
                      aria-pressed={active}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-3 text-left transition',
                        active ? 'bg-orange-500/10' : 'hover:bg-ink-700'
                      )}
                    >
                      <Avatar
                        src={opponent.profile_image_url}
                        name={opponent.display_name}
                        size="sm"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-white">
                          {opponent.display_name}
                        </span>
                        <span className="mt-0.5 flex items-center gap-2">
                          <HouseChip name={opponent.dorm_name} />
                        </span>
                      </span>
                      <span className="tabular shrink-0 text-sm font-semibold text-zinc-300">
                        {opponent.ratings[gameType] ?? 1500}
                      </span>
                      <span
                        className={cn(
                          'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition',
                          active
                            ? 'border-orange-500 bg-orange-500 text-white'
                            : 'border-line-strong text-transparent'
                        )}
                      >
                        <Icon name="check" className="h-3 w-3" strokeWidth={3} />
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>

      {error && <Banner tone="error">{error}</Banner>}

      <Button type="submit" size="lg" full disabled={loading || !opponentId}>
        {loading
          ? 'Sending challenge…'
          : selected
            ? `Challenge ${selected.display_name}`
            : 'Send challenge'}
      </Button>
    </form>
  )
}
