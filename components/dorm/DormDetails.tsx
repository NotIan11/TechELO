'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
  poolLeaderboard: Array<{
    rank: number
    user_id: string
    display_name: string
    rating: number
    matches_played: number
    wins: number
    losses: number
  }>
  pingPongLeaderboard: Array<{
    rank: number
    user_id: string
    display_name: string
    rating: number
    matches_played: number
    wins: number
    losses: number
  }>
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

  const handleJoin = async () => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/dorms/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dorm_id: dorm.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join dorm')
      }

      setMessage('Successfully joined dorm!')
      setTimeout(() => {
        router.refresh()
      }, 1000)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Dorm Header */}
      <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{dorm.name}</h1>
            {dorm.description && (
              <p className="mt-2 text-gray-600 dark:text-gray-400">{dorm.description}</p>
            )}
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Created {new Date(dorm.created_at).toLocaleDateString()}
            </p>
          </div>
          {!isMember && (
            <button
              onClick={handleJoin}
              disabled={loading}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Joining...' : 'Join Dorm'}
            </button>
          )}
          {isMember && (
            <span className="rounded-full bg-green-100 dark:bg-green-900/30 px-4 py-2 text-sm font-medium text-green-800 dark:text-green-200">
              Member
            </span>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-md bg-red-50 dark:bg-red-900/20 p-4">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {message && (
          <div className="mt-4 rounded-md bg-green-50 dark:bg-green-900/20 p-4">
            <p className="text-sm text-green-800 dark:text-green-200">{message}</p>
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="grid gap-6 md:grid-cols-4">
        <div className="rounded-lg bg-white dark:bg-gray-800 p-4 shadow">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Members</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalMembers}</p>
        </div>
        <div className="rounded-lg bg-white dark:bg-gray-800 p-4 shadow">
          <p className="text-sm text-gray-500 dark:text-gray-400">Pool Matches</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalPoolMatches}</p>
        </div>
        <div className="rounded-lg bg-white dark:bg-gray-800 p-4 shadow">
          <p className="text-sm text-gray-500 dark:text-gray-400">Ping Pong Matches</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.totalPingPongMatches}</p>
        </div>
        <div className="rounded-lg bg-white dark:bg-gray-800 p-4 shadow">
          <p className="text-sm text-gray-500 dark:text-gray-400">Avg Pool Rating</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.avgPoolRating}</p>
        </div>
      </div>

      {/* Leaderboards */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Pool Leaderboard</h2>
          {poolLeaderboard.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No pool players yet</p>
          ) : (
            <div className="space-y-2">
              {poolLeaderboard.map((entry) => (
                <Link
                  key={entry.user_id}
                  href={`/profile/${entry.user_id}`}
                  className="flex items-center justify-between p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">#{entry.rank}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{entry.display_name}</span>
                  </div>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{entry.rating}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Ping Pong Leaderboard</h2>
          {pingPongLeaderboard.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No ping pong players yet</p>
          ) : (
            <div className="space-y-2">
              {pingPongLeaderboard.map((entry) => (
                <Link
                  key={entry.user_id}
                  href={`/profile/${entry.user_id}`}
                  className="flex items-center justify-between p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">#{entry.rank}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{entry.display_name}</span>
                  </div>
                  <span className="text-sm font-bold text-green-600 dark:text-green-400">{entry.rating}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Members List */}
      <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Members</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <Link
              key={member.id}
              href={`/profile/${member.id}`}
              className="p-3 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                {member.profile_image_url ? (
                  <img
                    src={member.profile_image_url}
                    alt={member.display_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <span className="text-gray-500 dark:text-gray-400 text-lg font-semibold">
                      {member.display_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{member.display_name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{member.university_email}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
