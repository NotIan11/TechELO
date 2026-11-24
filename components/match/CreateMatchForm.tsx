'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { calculateElo } from '@/lib/elo'
import Banner from '@/components/ui/Banner'
import Button from '@/components/ui/Button'

type GameType = 'pool' | 'ping_pong'

interface Opponent {
  id: string
  display_name: string
  profile_image_url: string | null
  dorm_name: string | null
  ratings: Record<string, number>
  /** Rank per game; absent until they have a confirmed match in it */
  ranks?: Record<string, number>
}

interface CreateMatchFormProps {
  opponents: Opponent[]
  myRatings: Record<string, number>
  initialOpponentId: string | null
  initialGameType: GameType
}

const GAMES: { value: GameType; label: string }[] = [
  { value: 'pool', label: 'Pool' },
  { value: 'ping_pong', label: 'Ping pong' },
]

const signed = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n)}`

export default function CreateMatchForm({
  opponents,
  myRatings,
  initialOpponentId,
  initialGameType,
}: CreateMatchFormProps) {
  const pinnedId = initialOpponentId && opponents.some((o) => o.id === initialOpponentId) ? initialOpponentId : ''
  const [gameType, setGameType] = useState<GameType>(initialGameType)
  const [opponentId, setOpponentId] = useState(pinnedId)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const myRating = myRatings[gameType] ?? 1500

  // Closest to the viewer's rating first; a player the link preselected stays on top
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return opponents
      .filter((o) => !q || o.display_name.toLowerCase().includes(q) || (o.dorm_name ?? '').toLowerCase().includes(q))
      .map((o) => {
        const rating = o.ratings[gameType] ?? 1500
        return {
          ...o,
          rating,
          rank: o.ranks?.[gameType] ?? null,
          win: calculateElo(myRating, rating, 1).ratingChange1,
          lose: calculateElo(myRating, rating, 2).ratingChange1,
        }
      })
      .sort(
        (a, b) =>
          Number(b.id === pinnedId) - Number(a.id === pinnedId) ||
          Math.abs(a.rating - myRating) - Math.abs(b.rating - myRating) ||
          a.display_name.localeCompare(b.display_name)
      )
  }, [opponents, search, gameType, myRating, pinnedId])

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

  const grid = 'grid grid-cols-[28px_minmax(0,1fr)_56px_104px] sm:grid-cols-[28px_minmax(0,1fr)_70px_150px]'

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Game" className="inline-flex rounded border border-line-strong">
          {GAMES.map((g, i) => {
            const active = gameType === g.value
            return (
              <button
                key={g.value}
                type="button"
                onClick={() => setGameType(g.value)}
                aria-pressed={active}
                className={cn(
                  'min-h-[44px] px-4 text-sm transition',
                  i > 0 && 'border-l border-line-strong',
                  active ? 'bg-white font-medium text-ink-950' : 'text-zinc-400 hover:text-white'
                )}
              >
                {g.label}
              </button>
            )
          })}
        </div>
        <input
          id="opponent-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Find a player"
          placeholder="Find a player or a house"
          className="input min-w-0 flex-[1_1_200px]"
        />
      </div>

      <div className={cn(grid, 'mt-5 pb-2 text-xs text-mute')}>
        <span />
        <span>Closest to you first · you are at <span className="tabular">{myRating}</span></span>
        <span className="text-right">Rating</span>
        <span className="text-right">Win · Lose</span>
      </div>

      <div role="radiogroup" aria-label="Opponent" className="max-h-[420px] overflow-y-auto border-b border-line">
        {rows.length === 0 ? (
          <p className="border-t border-line py-5 text-sm text-mute">No players match “{search}”.</p>
        ) : (
          rows.map((o) => {
            const active = o.id === opponentId
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setOpponentId(active ? '' : o.id)}
                className={cn(grid, 'w-full items-center border-t border-line text-left transition min-h-[52px]', active ? 'bg-white/[0.05]' : 'hover:bg-white/[0.03]')}
              >
                <span aria-hidden="true" className={cn('ml-0.5 h-3.5 w-3.5 border', active ? 'border-orange-500 bg-orange-500' : 'border-white/40')} />
                <span className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 py-1.5">
                  <span className="truncate text-[15px] text-white">{o.display_name}</span>
                  <span className="text-xs text-mute">
                    {o.rank != null ? <span className="tabular">#{o.rank}</span> : 'Unranked'}
                    {o.dorm_name ? ` · ${o.dorm_name}` : ''}
                  </span>
                </span>
                <span className="tabular text-right text-sm text-white">{o.rating}</span>
                <span className="tabular text-right text-sm">
                  <span className="text-win">{signed(o.win)}</span>
                  <span className="text-zinc-600"> · </span>
                  <span className="text-loss">{signed(o.lose)}</span>
                </span>
              </button>
            )
          })
        )}
      </div>

      {error && (
        <Banner tone="error" className="mt-5">
          {error}
        </Banner>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Button type="submit" size="lg" disabled={loading || !opponentId}>
          {loading ? 'Sending challenge…' : selected ? `Challenge ${selected.display_name}` : 'Pick someone to challenge'}
        </Button>
        <span className="text-[13px] text-mute">{selected ? 'They have an hour to accept.' : 'They get an hour to accept.'}</span>
      </div>
    </form>
  )
}
