'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  display_name: string
}

interface CreateMatchFormProps {
  users: User[]
}

export default function CreateMatchForm({ users }: CreateMatchFormProps) {
  const [gameType, setGameType] = useState<'pool' | 'ping_pong'>('pool')
  const [opponentId, setOpponentId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!opponentId) {
      setError('Please select an opponent')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/matches/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          game_type: gameType,
          player2_id: opponentId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create match')
      }

      router.push('/inbox')
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-lg bg-gray-800 p-6 shadow">
      <div>
        <label htmlFor="gameType" className="block text-sm font-medium text-gray-300">
          Game Type
        </label>
        <select
          id="gameType"
          value={gameType}
          onChange={(e) => setGameType(e.target.value as 'pool' | 'ping_pong')}
          className="mt-1 block w-full min-h-[44px] rounded-md border border-gray-600 bg-gray-700 text-white px-3 py-2 text-base shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
        >
          <option value="pool">Pool</option>
          <option value="ping_pong">Ping Pong</option>
        </select>
      </div>

      <div>
        <label htmlFor="opponent" className="block text-sm font-medium text-gray-300">
          Opponent
        </label>
        <select
          id="opponent"
          value={opponentId}
          onChange={(e) => setOpponentId(e.target.value)}
          className="mt-1 block w-full min-h-[44px] rounded-md border border-gray-600 bg-gray-700 text-white px-3 py-2 text-base shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          required
        >
          <option value="">Select an opponent</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.display_name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-md bg-red-900/20 p-4">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full min-h-[44px] rounded-md bg-blue-600 px-4 py-3 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {loading ? 'Creating...' : 'Create Match'}
      </button>
    </form>
  )
}
