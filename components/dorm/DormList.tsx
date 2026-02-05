import Link from 'next/link'
import { getHouseColor } from '@/lib/utils'

interface Dorm {
  id: string
  name: string
  description: string | null
  created_at: string
  total_members: number
}

interface DormListProps {
  dorms: Dorm[]
  userDormId: string | null
}

export default function DormList({ dorms, userDormId }: DormListProps) {
  if (dorms.length === 0) {
    return (
      <div className="rounded-lg bg-gray-800 p-8 text-center shadow">
        <p className="text-gray-400 mb-4">No houses yet. Create the first one!</p>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {dorms.map((dorm) => (
        <Link
          key={dorm.id}
          href={`/dorms/${dorm.id}`}
          className="block rounded-lg p-6 shadow hover:shadow-lg transition-shadow text-white"
          style={{ backgroundColor: getHouseColor(dorm.name) }}
        >
          <div className="flex items-start justify-between mb-2">
            <h2 className="text-xl font-semibold">{dorm.name}</h2>
            {userDormId === dorm.id && (
              <span className="rounded-full bg-white/20 px-2 py-1 text-xs font-medium">
                Your House
              </span>
            )}
          </div>
          {dorm.description && (
            <p className="text-sm text-white/90 mb-4 line-clamp-2">{dorm.description}</p>
          )}
          <div className="flex items-center justify-between text-sm text-white/80">
            <span>{dorm.total_members} members</span>
            <span>View Details →</span>
          </div>
        </Link>
      ))}
    </div>
  )
}
