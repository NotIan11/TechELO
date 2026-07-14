'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import Button from '@/components/ui/Button'
import HouseChip from '@/components/ui/HouseChip'
import Segmented from '@/components/ui/Segmented'
import GameIcon from '@/components/ui/GameIcon'

interface LeaderboardEntry {
  rank: number
  user_id: string
  display_name: string
  rating: number
  matches_played: number
  wins: number
  losses: number
  dorm_name: string | null
  profile_image_url: string | null
}

interface LeaderboardClientProps {
  leaderboard: LeaderboardEntry[]
  gameType: 'pool' | 'ping_pong'
  currentPage: number
  totalPages: number
  dorms: { id: string; name: string }[]
  selectedDormId: string | null
  currentUserId: string | null
}

const podiumStyles = [
  {
    // 1st
    ring: 'ring-2 ring-amber-400/70',
    glow: 'shadow-xl shadow-amber-500/10',
    medal: 'bg-gradient-to-b from-amber-300 to-amber-500 text-amber-950',
  },
  {
    // 2nd
    ring: 'ring-2 ring-slate-300/40',
    glow: 'shadow-lg shadow-slate-400/5',
    medal: 'bg-gradient-to-b from-slate-200 to-slate-400 text-slate-900',
  },
  {
    // 3rd
    ring: 'ring-2 ring-orange-700/50',
    glow: 'shadow-lg shadow-orange-800/10',
    medal: 'bg-gradient-to-b from-orange-400 to-orange-700 text-orange-50',
  },
]

export default function LeaderboardClient({
  leaderboard,
  gameType,
  currentPage,
  totalPages,
  dorms,
  selectedDormId,
  currentUserId,
}: LeaderboardClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    router.push(`/?${params.toString()}`)
  }

  const showPodium = currentPage === 1 && leaderboard.length >= 3
  const podium = showPodium ? leaderboard.slice(0, 3) : []
  const tableEntries = showPodium ? leaderboard.slice(3) : leaderboard
  const maxRating = leaderboard.length > 0 ? Math.max(...leaderboard.map((e) => e.rating)) : 1

  const winRate = (e: LeaderboardEntry) =>
    e.matches_played > 0 ? Math.round((e.wins / e.matches_played) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={gameType}
          onChange={(value) => updateParams({ game_type: value, page: null })}
          options={[
            { value: 'pool', label: 'Pool', icon: <GameIcon game="pool" className="h-4 w-4 text-pool" /> },
            { value: 'ping_pong', label: 'Ping Pong', icon: <GameIcon game="ping_pong" className="h-4 w-4 text-pong" /> },
          ]}
        />
        <select
          value={selectedDormId || ''}
          onChange={(e) => updateParams({ dorm_id: e.target.value || null, page: null })}
          aria-label="Filter by house"
          className="input w-auto min-w-[10rem] cursor-pointer"
        >
          <option value="">All Houses</option>
          {dorms.map((dorm) => (
            <option key={dorm.id} value={dorm.id}>
              {dorm.name}
            </option>
          ))}
        </select>
      </div>

      {leaderboard.length === 0 ? (
        <EmptyState
          icon={<GameIcon game={gameType} className="h-10 w-10 text-slate-500" />}
          title="No ranked players yet"
          description="Rankings appear once a match has been played and confirmed. Be the first on the board."
          action={<Button href="/matches/new">Start a match</Button>}
        />
      ) : (
        <>
          {/* Podium */}
          {showPodium && (
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Order 2-1-3 on desktop so #1 sits in the middle */}
              {[podium[1], podium[0], podium[2]].map((entry, i) => {
                const style = podiumStyles[entry.rank - 1] ?? podiumStyles[2]
                const first = entry.rank === 1
                return (
                  <Link
                    key={entry.user_id}
                    href={`/profile/${entry.user_id}`}
                    className={cn(
                      'card group relative flex flex-col items-center p-6 text-center transition hover:-translate-y-0.5',
                      style.glow,
                      first && 'sm:-mt-3 sm:pb-8',
                      // Put #1 first in DOM order on mobile
                      first ? 'order-first sm:order-none' : ''
                    )}
                  >
                    <span
                      className={cn(
                        'absolute -top-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold shadow-md',
                        style.medal
                      )}
                    >
                      {entry.rank}
                    </span>
                    <Avatar
                      src={entry.profile_image_url}
                      name={entry.display_name}
                      size={first ? 'xl' : 'lg'}
                      className={style.ring}
                    />
                    <p className="mt-3 font-display text-lg font-semibold text-white group-hover:text-orange-300">
                      {entry.display_name}
                    </p>
                    <p className="tabular mt-0.5 font-display text-3xl font-bold text-white">
                      {entry.rating}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {entry.wins}W – {entry.losses}L · {winRate(entry)}% win rate
                    </p>
                    <div className="mt-2">
                      <HouseChip name={entry.dorm_name} />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Table */}
          {tableEntries.length > 0 && (
            <Card padding="none" className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/[0.06]">
                  <thead>
                    <tr className="text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3 sm:px-6">#</th>
                      <th className="px-4 py-3 sm:px-6">Player</th>
                      <th className="px-4 py-3 sm:px-6">Rating</th>
                      <th className="hidden px-4 py-3 sm:table-cell sm:px-6">Record</th>
                      <th className="hidden px-4 py-3 md:table-cell md:px-6">House</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {tableEntries.map((entry) => {
                      const isMe = entry.user_id === currentUserId
                      return (
                        <tr
                          key={entry.user_id}
                          className={cn(
                            'transition hover:bg-white/[0.03]',
                            isMe && 'bg-orange-400/[0.06]'
                          )}
                        >
                          <td className="tabular whitespace-nowrap px-4 py-3.5 text-sm font-semibold text-slate-500 sm:px-6">
                            {entry.rank}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 sm:px-6">
                            <Link
                              href={`/profile/${entry.user_id}`}
                              className="group inline-flex items-center gap-3"
                            >
                              <Avatar
                                src={entry.profile_image_url}
                                name={entry.display_name}
                                size="sm"
                              />
                              <span className="text-sm font-medium text-white group-hover:text-orange-300">
                                {entry.display_name}
                                {isMe && <span className="ml-2 text-xs text-orange-400">you</span>}
                              </span>
                            </Link>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 sm:px-6">
                            <div className="flex items-center gap-3">
                              <span className="tabular font-display text-sm font-bold text-white">
                                {entry.rating}
                              </span>
                              <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-white/[0.06] lg:block">
                                <span
                                  className={cn(
                                    'block h-full rounded-full',
                                    gameType === 'pool' ? 'bg-pool/70' : 'bg-pong/70'
                                  )}
                                  style={{ width: `${Math.max(8, (entry.rating / maxRating) * 100)}%` }}
                                />
                              </span>
                            </div>
                          </td>
                          <td className="hidden whitespace-nowrap px-4 py-3.5 text-sm text-slate-400 sm:table-cell sm:px-6">
                            <span className="text-emerald-400">{entry.wins}W</span>
                            {' – '}
                            <span className="text-red-400">{entry.losses}L</span>
                            <span className="ml-2 text-xs text-slate-500">{winRate(entry)}%</span>
                          </td>
                          <td className="hidden whitespace-nowrap px-4 py-3.5 md:table-cell md:px-6">
                            <HouseChip name={entry.dorm_name} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => updateParams({ page: String(currentPage - 1) })}
              >
                ← Previous
              </Button>
              <p className="tabular text-sm text-slate-400">
                Page {currentPage} of {totalPages}
              </p>
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => updateParams({ page: String(currentPage + 1) })}
              >
                Next →
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
