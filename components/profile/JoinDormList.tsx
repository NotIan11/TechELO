'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getHouseColor } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'

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
        headers: { 'Content-Type': 'application/json' },
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
      setLoading(null)
    }
  }

  if (dorms.length === 0) {
    return (
      <EmptyState
        icon="🏠"
        title="No houses yet"
        description="Be the founder — create the first house."
        action={<Button href="/dorms/new">Create a house</Button>}
      />
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-loss/20 bg-loss/10 p-4">
          <p className="text-sm text-loss">{error}</p>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {dorms.map((dorm) => {
          const color = getHouseColor(dorm.name)
          const isCurrent = userDormId === dorm.id
          return (
            <div key={dorm.id} className="card relative overflow-hidden p-5">
              <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: color }} />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-[0.07]"
                style={{ background: `linear-gradient(120deg, ${color}, transparent 55%)` }}
              />
              <div className="relative z-10">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <h2 className="font-display text-lg font-semibold text-white">{dorm.name}</h2>
                  {isCurrent && (
                    <Badge tone="orange" dot>
                      Current
                    </Badge>
                  )}
                </div>
                {dorm.description && (
                  <p className="mb-3 line-clamp-2 text-sm text-zinc-400">{dorm.description}</p>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-zinc-500">
                    {dorm.total_members} member{dorm.total_members === 1 ? '' : 's'}
                  </span>
                  {!isCurrent && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleJoin(dorm.id)}
                      disabled={loading === dorm.id}
                    >
                      {loading === dorm.id ? 'Joining…' : 'Join'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
