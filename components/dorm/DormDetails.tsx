'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn, getHouseColor, formatDate } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import Banner from '@/components/ui/Banner'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import GameIcon from '@/components/ui/GameIcon'
import MoneyDelta from '@/components/ui/MoneyDelta'
import StatTile from '@/components/ui/StatTile'

interface LeaderboardRow {
  rank: number
  user_id: string
  display_name: string
  rating: number
  matches_played: number
  wins: number
  losses: number
  profile_image_url: string | null
}

interface PokerRow {
  rank: number
  user_id: string
  display_name: string
  profile_image_url: string | null
  net_cents: number
  sessions_played: number
}

interface DormDetailsProps {
  dorm: {
    id: string
    name: string
    description: string | null
    created_at: string
    total_members: number
  }
  members: Array<{
    id: string
    display_name: string
    university_email: string
    profile_image_url: string | null
    created_at: string
  }>
  isMember: boolean
  poolLeaderboard: LeaderboardRow[]
  pingPongLeaderboard: LeaderboardRow[]
  pokerLeaderboard: PokerRow[]
  stats: {
    totalMembers: number
    totalPoolMatches: number
    totalPingPongMatches: number
    avgPoolRating: number
    avgPingPongRating: number
  }
}

export default function DormDetails({
  dorm,
  members,
  isMember,
  poolLeaderboard,
  pingPongLeaderboard,
  pokerLeaderboard,
  stats,
}: DormDetailsProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()
  const color = getHouseColor(dorm.name)

  const handleJoin = async () => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/dorms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dorm_id: dorm.id }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to join house')
      }
      setMessage(`Welcome to ${dorm.name}!`)
      setTimeout(() => {
        router.refresh()
      }, 800)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const boardRow = (userId: string, rank: number, avatar: string | null, name: string, value: React.ReactNode) => (
    <li key={userId}>
      <Link href={`/profile/${userId}`} className="flex items-center justify-between gap-3 rounded-lg p-2 transition hover:bg-ink-700">
        <span className="flex min-w-0 items-center gap-3">
          <span className="tabular w-5 shrink-0 text-right text-sm font-semibold text-zinc-500">{rank}</span>
          <Avatar src={avatar} name={name} size="xs" />
          <span className="truncate text-sm font-medium text-white">{name}</span>
        </span>
        {value}
      </Link>
    </li>
  )

  const miniBoard = (title: string, game: 'pool' | 'ping_pong', rows: LeaderboardRow[]) => (
    <Card>
      <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-white">
        <GameIcon game={game} className={cn('h-5 w-5', game === 'pool' ? 'text-pool' : 'text-pong')} />
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">No ranked players yet.</p>
      ) : (
        <ol className="space-y-1">
          {rows.map((entry) =>
            boardRow(
              entry.user_id,
              entry.rank,
              entry.profile_image_url,
              entry.display_name,
              <span className={cn('tabular shrink-0 text-sm font-bold', game === 'pool' ? 'text-pool' : 'text-pong')}>{entry.rating}</span>
            )
          )}
        </ol>
      )}
    </Card>
  )

  const avgRating =
    stats.avgPoolRating || stats.avgPingPongRating
      ? Math.round(
          (stats.avgPoolRating + stats.avgPingPongRating) /
            ((stats.avgPoolRating ? 1 : 0) + (stats.avgPingPongRating ? 1 : 0) || 1)
        )
      : '—'

  return (
    <div className="space-y-6">
      {/* House header */}
      <Card className="relative overflow-hidden">
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: color }} />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{ background: `linear-gradient(120deg, ${color}, transparent 55%)` }}
        />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-white">{dorm.name}</h1>
            {dorm.description && <p className="mt-2 text-zinc-400">{dorm.description}</p>}
            <p className="mt-2 text-xs text-zinc-500">Founded {formatDate(dorm.created_at)}</p>
          </div>
          {isMember ? (
            <Badge tone="green" dot className="sm:mt-1">
              Member
            </Badge>
          ) : (
            <Button onClick={handleJoin} disabled={loading}>
              {loading ? 'Joining…' : 'Join house'}
            </Button>
          )}
        </div>

        {error && <Banner tone="error" className="relative z-10 mt-4">{error}</Banner>}
        {message && <Banner tone="success" className="relative z-10 mt-4">{message}</Banner>}
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Members" value={stats.totalMembers} />
        <StatTile label="Pool matches" value={stats.totalPoolMatches} tone="pool" />
        <StatTile label="Ping pong matches" value={stats.totalPingPongMatches} tone="pong" />
        <StatTile label="Avg rating" value={avgRating} />
      </div>

      {/* Leaderboards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {miniBoard('Pool', 'pool', poolLeaderboard)}
        {miniBoard('Ping Pong', 'ping_pong', pingPongLeaderboard)}
        <Card>
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-white">
            <GameIcon game="poker" className="h-5 w-5 text-poker" />
            Poker <span className="text-xs font-normal text-zinc-500">this term</span>
          </h2>
          {pokerLeaderboard.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No sessions logged yet.{' '}
              <Link href="/poker" className="text-orange-400 underline-offset-2 hover:underline">
                Start one
              </Link>
            </p>
          ) : (
            <ol className="space-y-1">
              {pokerLeaderboard.map((entry) =>
                boardRow(entry.user_id, entry.rank, entry.profile_image_url, entry.display_name, <MoneyDelta cents={entry.net_cents} chip compact />)
              )}
            </ol>
          )}
        </Card>
      </div>

      {/* Members */}
      <Card>
        <h2 className="mb-4 font-display text-lg font-semibold text-white">Members</h2>
        {members.length === 0 ? (
          <p className="text-sm text-zinc-500">No members yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => (
              <Link
                key={member.id}
                href={`/profile/${member.id}`}
                className="flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-line-strong hover:bg-ink-700"
              >
                <Avatar src={member.profile_image_url} name={member.display_name} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{member.display_name}</p>
                  <p className="truncate text-xs text-zinc-500">{member.university_email}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
