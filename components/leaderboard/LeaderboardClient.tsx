'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import { MiniBar, Table, Td, Th, Tr } from '@/components/ui/DataTable'
import EmptyState from '@/components/ui/EmptyState'
import GameIcon from '@/components/ui/GameIcon'
import HouseChip from '@/components/ui/HouseChip'
import Pagination from '@/components/ui/Pagination'
import RankRing from '@/components/ui/RankRing'
import Segmented from '@/components/ui/Segmented'

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

const PODIUM_RING = ['ring-2 ring-orange-500', 'ring-2 ring-zinc-300', 'ring-2 ring-zinc-500']

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
    const qs = params.toString()
    router.push(`/leaderboard${qs ? `?${qs}` : ''}`)
  }

  const showPodium = currentPage === 1 && leaderboard.length >= 3
  const podium = showPodium ? leaderboard.slice(0, 3) : []
  const tableEntries = showPodium ? leaderboard.slice(3) : leaderboard
  const maxRating = leaderboard.length > 0 ? Math.max(...leaderboard.map((e) => e.rating)) : 1

  const winRate = (e: LeaderboardEntry) => (e.matches_played > 0 ? Math.round((e.wins / e.matches_played) * 100) : 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={gameType}
          onChange={(value) => updateParams({ game_type: value, page: null })}
          options={[
            { value: 'pool', label: 'Pool', icon: <GameIcon game="pool" size="sm" /> },
            { value: 'ping_pong', label: 'Ping Pong', icon: <GameIcon game="ping_pong" size="sm" /> },
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
          icon={<GameIcon game={gameType} />}
          title="Nobody is ranked yet"
          description="A rating appears after one confirmed match."
          action={<Button href="/matches/new">Challenge someone</Button>}
        />
      ) : (
        <>
          {showPodium && (
            <div className="grid gap-4 sm:grid-cols-3">
              {[podium[1], podium[0], podium[2]].map((entry) => {
                const first = entry.rank === 1
                return (
                  <Link
                    key={entry.user_id}
                    href={`/profile/${entry.user_id}`}
                    className={cn(
                      'card group relative flex flex-col items-center p-6 text-center transition hover:border-line-strong',
                      first && 'sm:-mt-3 sm:pb-8',
                      first ? 'order-first sm:order-none' : ''
                    )}
                  >
                    <RankRing rank={entry.rank} size="md" className="absolute -top-3.5 bg-ink-800" />
                    <Avatar
                      src={entry.profile_image_url}
                      name={entry.display_name}
                      size={first ? 'xl' : 'lg'}
                      className={PODIUM_RING[entry.rank - 1]}
                    />
                    <p className="mt-3 font-display text-lg font-semibold text-white group-hover:text-orange-400">{entry.display_name}</p>
                    <p className="tabular mt-0.5 font-display text-4xl font-bold tracking-tight text-white">{entry.rating}</p>
                    <p className="tabular mt-1 text-xs text-zinc-400">
                      {entry.wins}W – {entry.losses}L · {winRate(entry)}%
                    </p>
                    <div className="mt-2">
                      <HouseChip name={entry.dorm_name} />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {tableEntries.length > 0 && (
            <Table>
              <thead>
                <tr>
                  <Th>#</Th>
                  <Th>Player</Th>
                  <Th>Rating</Th>
                  <Th hide="sm">Record</Th>
                  <Th hide="md">House</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {tableEntries.map((entry) => {
                  const isMe = entry.user_id === currentUserId
                  return (
                    <Tr key={entry.user_id} me={isMe}>
                      <Td className="tabular font-semibold text-zinc-500">{entry.rank}</Td>
                      <Td>
                        <Link href={`/profile/${entry.user_id}`} className="group inline-flex items-center gap-3">
                          <Avatar src={entry.profile_image_url} name={entry.display_name} size="sm" />
                          <span className="text-sm font-medium text-white group-hover:text-orange-400">
                            {entry.display_name}
                            {isMe && <span className="ml-2 text-xs text-orange-400">you</span>}
                          </span>
                        </Link>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-3">
                          <span className="tabular font-display text-sm font-bold text-white">{entry.rating}</span>
                          <MiniBar value={entry.rating} max={maxRating} className="hidden lg:block" />
                        </div>
                      </Td>
                      <Td hide="sm" className="tabular text-zinc-400">
                        <span className="text-win">{entry.wins}W</span>
                        {' – '}
                        <span className="text-loss">{entry.losses}L</span>
                        <span className="ml-2 text-xs text-zinc-500">{winRate(entry)}%</span>
                      </Td>
                      <Td hide="md">
                        <HouseChip name={entry.dorm_name} />
                      </Td>
                    </Tr>
                  )
                })}
              </tbody>
            </Table>
          )}

          <Pagination page={currentPage} totalPages={totalPages} onPage={(p) => updateParams({ page: String(p) })} />
        </>
      )}
    </div>
  )
}
