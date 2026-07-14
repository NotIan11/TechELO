'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn, getHouseColor, formatDate } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import GameIcon from '@/components/ui/GameIcon'

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

  const miniBoard = (title: string, game: 'pool' | 'ping_pong', rows: LeaderboardRow[]) => (
    <Card>
      <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-white">
        <GameIcon game={game} className={cn('h-5 w-5', game === 'pool' ? 'text-pool' : 'text-pong')} />
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">No ranked players yet.</p>
      ) : (
        <ol className="space-y-1">
          {rows.map((entry) => (
            <li key={entry.user_id}>
              <Link
                href={`/profile/${entry.user_id}`}
                className="flex items-center justify-between gap-3 rounded-lg p-2 transition hover:bg-white/[0.04]"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="tabular w-5 shrink-0 text-right text-sm font-semibold text-slate-500">
                    {entry.rank}
                  </span>
                  <Avatar src={entry.profile_image_url} name={entry.display_name} size="xs" />
                  <span className="truncate text-sm font-medium text-white">{entry.display_name}</span>
                </span>
                <span
                  className={cn(
                    'tabular shrink-0 text-sm font-bold',
                    game === 'pool' ? 'text-pool' : 'text-pong'
                  )}
                >
                  {entry.rating}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )

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
            {dorm.description && <p className="mt-2 text-slate-400">{dorm.description}</p>}
            <p className="mt-2 text-xs text-slate-500">Founded {formatDate(dorm.created_at)}</p>
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

        {error && (
          <div className="relative z-10 mt-4 rounded-xl border border-red-500/25 bg-red-500/10 p-4">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}
        {message && (
          <div className="relative z-10 mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4">
            <p className="text-sm text-emerald-300">{message}</p>
          </div>
        )}
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'Members', value: stats.totalMembers, className: 'text-white' },
          { label: 'Pool matches', value: stats.totalPoolMatches, className: 'text-pool' },
          { label: 'Ping pong matches', value: stats.totalPingPongMatches, className: 'text-pong' },
          {
            label: 'Avg rating',
            value:
              stats.avgPoolRating || stats.avgPingPongRating
                ? Math.round(
                    (stats.avgPoolRating + stats.avgPingPongRating) /
                      ((stats.avgPoolRating ? 1 : 0) + (stats.avgPingPongRating ? 1 : 0) || 1)
                  )
                : '—',
            className: 'text-white',
          },
        ].map(({ label, value, className }) => (
          <Card key={label} padding="sm">
            <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
            <p className={cn('tabular mt-1 font-display text-2xl font-bold', className)}>{value}</p>
          </Card>
        ))}
      </div>

      {/* Leaderboards */}
      <div className="grid gap-6 md:grid-cols-2">
        {miniBoard('Pool', 'pool', poolLeaderboard)}
        {miniBoard('Ping Pong', 'ping_pong', pingPongLeaderboard)}
      </div>

      {/* Members */}
      <Card>
        <h2 className="mb-4 font-display text-lg font-semibold text-white">Members</h2>
        {members.length === 0 ? (
          <p className="text-sm text-slate-500">No members yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => (
              <Link
                key={member.id}
                href={`/profile/${member.id}`}
                className="flex items-center gap-3 rounded-xl border border-white/[0.06] p-3 transition hover:border-white/[0.14] hover:bg-white/[0.03]"
              >
                <Avatar src={member.profile_image_url} name={member.display_name} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{member.display_name}</p>
                  <p className="truncate text-xs text-slate-500">{member.university_email}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
