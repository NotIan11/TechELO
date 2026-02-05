'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getHouseColor } from '@/lib/utils'

interface Dorm {
  id: string
  name: string
  description: string | null
  created_at: string
  total_members: number
}

interface JoinDormListProps {
  dorms: Dorm[]
  userDormId: string | null
}

export default function JoinDormList({ dorms, userDormId }: JoinDormListProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleJoin = async (dormId: string) => {
    setLoading(dormId)
    setError('')

    try {
      const response = await fetch('/api/dorms/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dorm_id: dormId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join house')
      }

      router.push('/profile')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(null)
    }
  }

  if (dorms.length === 0) {
    return (
      <div className="rounded-lg bg-gray-800 p-8 text-center shadow">
        <p className="text-gray-400 mb-4">No houses available yet.</p>
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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {dorms.map((dorm) => (
          <div
            key={dorm.id}
            className="block rounded-lg bg-gray-800 p-6 shadow hover:shadow-lg transition-shadow border-l-4"
            style={{ borderLeftColor: getHouseColor(dorm.name) }}
          >
            <div className="flex items-start justify-between mb-2">
              <h2 className="text-xl font-semibold text-white">{dorm.name}</h2>
              {userDormId === dorm.id && (
                <span className="rounded-full bg-green-900/30 px-2 py-1 text-xs font-medium text-green-200">
                  Current
                </span>
              )}
            </div>
            {dorm.description && (
              <p className="text-sm text-gray-400 mb-4 line-clamp-2">{dorm.description}</p>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">{dorm.total_members} members</span>
              {userDormId === dorm.id ? (
                <span className="text-sm text-gray-500">Already a member</span>
              ) : (
                <button
                  onClick={() => handleJoin(dorm.id)}
                  disabled={loading === dorm.id}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading === dorm.id ? 'Joining...' : 'Join'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
