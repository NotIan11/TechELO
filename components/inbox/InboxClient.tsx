'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDateTime } from '@/lib/utils'

type PendingMatch = {
  id: string
  game_type: string
  status: string
  player1_id: string
  player2_id: string
  player1_start_accepted: boolean
  player2_start_accepted: boolean
  player1_result_accepted: boolean
  player2_result_accepted: boolean
  player1: { id: string; display_name: string }
  player2: { id: string; display_name: string }
  created_at: string
}

type PendingItem = {
  match: PendingMatch
  action: 'accept_start' | 'decline_start' | 'report_result'
}

interface InboxClientProps {
  pendingItems: PendingItem[]
}

export default function InboxClient({ pendingItems: initialItems }: InboxClientProps) {
  const [pendingItems, setPendingItems] = useState(initialItems)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [confirming, setConfirming] = useState<{
    matchId: string
    action: 'accept_start' | 'decline_start' | 'report_result'
    winnerId?: string
  } | null>(null)
  const router = useRouter()

  const removeItem = (matchId: string) => {
    setPendingItems((prev) => prev.filter((i) => i.match.id !== matchId))
  }

  const handleAcceptStart = async (matchId: string) => {
    setLoading(matchId)
    setError('')
    setMessage('')
    try {
      const res = await fetch('/api/matches/accept-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: matchId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to accept')
      removeItem(matchId)
      setMessage('Match start accepted!')
      router.push('/inbox/confirmed?type=start')
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(null)
      setConfirming(null)
    }
  }

  const handleDecline = async (matchId: string) => {
    setLoading(matchId)
    setError('')
    setMessage('')
    try {
      const res = await fetch('/api/matches/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: matchId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to decline')
      removeItem(matchId)
      setMessage('Challenge declined.')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(null)
      setConfirming(null)
    }
  }

  const handleAcceptResult = async (matchId: string, winnerId: string) => {
    setLoading(matchId)
    setError('')
    setMessage('')
    try {
      const res = await fetch('/api/matches/accept-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: matchId, winner_id: winnerId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit result')
      removeItem(matchId)
      setMessage(data.match?.status === 'completed' ? 'Match completed! ELO updated.' : 'Result submitted. Waiting for opponent.')
      router.push('/inbox/confirmed?type=result')
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(null)
      setConfirming(null)
    }
  }

  if (pendingItems.length === 0) {
    return (
      <div className="rounded-lg bg-gray-800 p-8 text-center shadow">
        <p className="text-gray-400">No pending challenges or results.</p>
        <Link href="/matches/new" className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Create a match
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
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
      {pendingItems.map(({ match, action }) => {
        const isConfirming = confirming?.matchId === match.id
        const isAcceptStart = action === 'accept_start'
        const isReportResult = action === 'report_result'
        const busy = loading === match.id

        return (
          <div key={match.id} className="rounded-lg bg-gray-800 p-6 shadow">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {match.status === 'pending_start' && (
                  <p className="text-lg font-medium text-white">
                    {match.player1.display_name} challenged you to a {match.game_type.replace('_', ' ')} match
                  </p>
                )}
                {(match.status === 'in_progress' || match.status === 'pending_result') && (
                  <p className="text-lg font-medium text-white">
                    Report or confirm result: {match.player1.display_name} vs {match.player2.display_name} ({match.game_type})
                  </p>
                )}
                <p className="mt-1 text-sm text-gray-400">{formatDateTime(match.created_at)}</p>
              </div>

              {!isConfirming && (
                <div className="flex flex-wrap gap-2">
                  {isAcceptStart && (
                    <>
                      <button
                        type="button"
                        onClick={() => setConfirming({ matchId: match.id, action: 'accept_start' })}
                        disabled={!!loading}
                        className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirming({ matchId: match.id, action: 'decline_start' })}
                        disabled={!!loading}
                        className="rounded-md bg-gray-600 px-4 py-2 text-white hover:bg-gray-700 disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </>
                  )}
                  {isReportResult && (
                    <>
                      <button
                        type="button"
                        onClick={() => setConfirming({ matchId: match.id, action: 'report_result', winnerId: match.player1_id })}
                        disabled={!!loading}
                        className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {match.player1.display_name} won
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirming({ matchId: match.id, action: 'report_result', winnerId: match.player2_id })}
                        disabled={!!loading}
                        className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {match.player2.display_name} won
                      </button>
                    </>
                  )}
                </div>
              )}

              {isConfirming && confirming?.matchId === match.id && (
                <div className="rounded-lg border border-gray-600 bg-gray-700/50 p-4">
                  {confirming.action === 'accept_start' && (
                    <>
                      <p className="text-sm text-gray-200 mb-3">Accept this match? It will start the game.</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleAcceptStart(match.id)}
                          disabled={busy}
                          className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          {busy ? 'Accepting...' : 'Confirm'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirming(null)}
                          disabled={busy}
                          className="rounded-md bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                  {confirming.action === 'decline_start' && (
                    <>
                      <p className="text-sm text-gray-200 mb-3">Decline this challenge?</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleDecline(match.id)}
                          disabled={busy}
                          className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          {busy ? 'Declining...' : 'Confirm decline'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirming(null)}
                          disabled={busy}
                          className="rounded-md bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                  {confirming.action === 'report_result' && confirming.winnerId && (
                    <>
                      <p className="text-sm text-gray-200 mb-3">
                        Set winner to {confirming.winnerId === match.player1_id ? match.player1.display_name : match.player2.display_name}?
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleAcceptResult(match.id, confirming.winnerId!)}
                          disabled={busy}
                          className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          {busy ? 'Submitting...' : 'Confirm'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirming(null)}
                          disabled={busy}
                          className="rounded-md bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
