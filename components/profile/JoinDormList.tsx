'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getHouseColor } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Banner from '@/components/ui/Banner'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import ListRow from '@/components/ui/ListRow'

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
    return <EmptyState icon="house" title="No houses yet" description="Create the first house." action={<Button href="/dorms/new">Create a house</Button>} />
  }

  return (
    <div className="space-y-4">
      {error && <Banner tone="error">{error}</Banner>}
      <div className="space-y-3">
        {dorms.map((dorm) => {
          const isCurrent = userDormId === dorm.id
          return (
            <ListRow
              key={dorm.id}
              accent={getHouseColor(dorm.name)}
              title={<span className="font-display text-lg">{dorm.name}</span>}
              badges={
                isCurrent ? (
                  <Badge tone="orange" dot>
                    Current
                  </Badge>
                ) : undefined
              }
              meta={
                <>
                  <span>
                    {dorm.total_members} member{dorm.total_members === 1 ? '' : 's'}
                  </span>
                  {dorm.description && <span className="line-clamp-1">· {dorm.description}</span>}
                </>
              }
              trailing={
                !isCurrent ? (
                  <Button size="sm" variant="secondary" onClick={() => handleJoin(dorm.id)} disabled={loading === dorm.id} type="button">
                    {loading === dorm.id ? 'Joining…' : 'Join'}
                  </Button>
                ) : undefined
              }
            />
          )
        })}
      </div>
    </div>
  )
}
