'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { formatDateTime } from '@/lib/utils'

interface MatchDetailsProps {
  match: any
  currentUserId: string
}

export default function MatchDetails({ match: initialMatch, currentUserId }: MatchDetailsProps) {
  const [match, setMatch] = useState(initialMatch)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()

  const supabase = createClient()
  const isPlayer1 = match.player1_id === currentUserId
  const isPlayer2 = match.player2_id === currentUserId

  // Subscribe to match updates
  useEffect(() => {
    const channel = supabase
      .channel(`match:${match.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${match.id}`,
        },
        (payload) => {
          setMatch(payload.new as any)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [match.id, supabase])

  const handleAcceptStart = async () => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/matches/accept-start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ match_id: match.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept match start')
      }

      setMatch(data.match)
      setMessage('Match start accepted!')
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptResult = async (winnerId: string) => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/matches/accept-result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          match_id: match.id,
          winner_id: winnerId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept match result')
      }

      setMatch(data.match)
      
      if (data.match.status === 'completed') {
        setMessage('Match completed! ELO ratings updated.')
        setTimeout(() => {
          router.push('/profile')
        }, 2000)
      } else if (data.match.status === 'disputed') {
        setError('Match disputed - players reported different winners')
      } else {
        setMessage('Result submitted. Waiting for opponent confirmation...')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const canAcceptStart = () => {
    if (match.status !== 'pending_start') return false
    if (isPlayer1 && !match.player1_start_accepted) return true
    if (isPlayer2 && !match.player2_start_accepted) return true
    return false
  }

  const canAcceptResult = () => {
    if (match.status !== 'in_progress' && match.status !== 'pending_result') return false
    if (isPlayer1 && !match.player1_result_accepted) return true
    if (isPlayer2 && !match.player2_result_accepted) return true
    return false
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_start':
        return 'bg-yellow-900/30 text-yellow-200'
      case 'in_progress':
        return 'bg-blue-900/30 text-blue-200'
      case 'pending_result':
        return 'bg-purple-900/30 text-purple-200'
      case 'completed':
        return 'bg-green-900/30 text-green-200'
      case 'disputed':
        return 'bg-red-900/30 text-red-200'
      default:
        return 'bg-gray-700 text-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-gray-800 p-6 shadow">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white">Match Details</h1>
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(match.status)}`}>
            {match.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-400">Game Type</p>
            <p className="text-lg font-semibold capitalize text-white">{match.game_type}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Created</p>
            <p className="text-lg font-semibold text-white">{formatDateTime(match.created_at)}</p>
          </div>
        </div>

        <div className="border-t border-gray-700 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-400 mb-2">Player 1</p>
              <p className="text-xl font-bold text-white">{match.player1.display_name}</p>
              <p className="text-sm text-gray-300">ELO: {match.player1_elo_before}</p>
              {match.player1_elo_after && (
                <p className="text-sm text-green-400">
                  New ELO: {match.player1_elo_after} ({match.player1_elo_after > match.player1_elo_before ? '+' : ''}{match.player1_elo_after - match.player1_elo_before})
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-2">Player 2</p>
              <p className="text-xl font-bold text-white">{match.player2.display_name}</p>
              <p className="text-sm text-gray-300">ELO: {match.player2_elo_before}</p>
              {match.player2_elo_after && (
                <p className="text-sm text-green-400">
                  New ELO: {match.player2_elo_after} ({match.player2_elo_after > match.player2_elo_before ? '+' : ''}{match.player2_elo_after - match.player2_elo_before})
                </p>
              )}
            </div>
          </div>
        </div>

        {match.winner_id && (
          <div className="mt-4 p-4 bg-green-900/20 rounded-md">
            <p className="text-sm text-gray-300">Winner:</p>
            <p className="text-lg font-bold text-green-300">
              {match.winner_id === match.player1_id ? match.player1.display_name : match.player2.display_name}
            </p>
          </div>
        )}
      </div>

      {/* Match Start Acceptance */}
      {canAcceptStart() && (
        <div className="rounded-lg bg-yellow-900/20 p-6 shadow">
          <h2 className="text-lg font-semibold text-white mb-4">
            Accept Match Start
          </h2>
          <p className="text-sm text-gray-300 mb-4">
            Both players must accept before the match can begin.
          </p>
          <button
            onClick={handleAcceptStart}
            disabled={loading}
            className="rounded-md bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-700 disabled:opacity-50"
          >
            {loading ? 'Accepting...' : 'Accept Match Start'}
          </button>
        </div>
      )}

      {/* Match Result Acceptance */}
      {canAcceptResult() && (
        <div className="rounded-lg bg-purple-900/20 p-6 shadow">
          <h2 className="text-lg font-semibold text-white mb-4">
            Report Match Result
          </h2>
          <p className="text-sm text-gray-300 mb-4">
            Select the winner of the match. Both players must agree on the result.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => handleAcceptResult(match.player1_id)}
              disabled={loading}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {match.player1.display_name} Won
            </button>
            <button
              onClick={() => handleAcceptResult(match.player2_id)}
              disabled={loading}
              className="flex-1 rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
            >
              {match.player2.display_name} Won
            </button>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {match.status === 'pending_start' && (
        <div className="rounded-lg bg-blue-900/20 p-4">
          <p className="text-sm text-blue-200">
            {isPlayer1 && match.player1_start_accepted && 'You have accepted. '}
            {isPlayer2 && match.player2_start_accepted && 'You have accepted. '}
            Waiting for opponent to accept match start...
          </p>
        </div>
      )}

      {match.status === 'pending_result' && (
        <div className="rounded-lg bg-purple-900/20 p-4">
          <p className="text-sm text-purple-200">
            {isPlayer1 && match.player1_result_accepted && 'You have submitted your result. '}
            {isPlayer2 && match.player2_result_accepted && 'You have submitted your result. '}
            Waiting for opponent to confirm result...
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-900/20 p-4">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {message && (
        <div className="rounded-md bg-green-900/20 p-4">
          <p className="text-sm text-green-200">{message}</p>
        </div>
      )}
    </div>
  )
}
