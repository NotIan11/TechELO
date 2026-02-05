import Link from 'next/link'

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
        <Link
          href="/dorms/new"
          className="inline-block rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Create House
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {dorms.map((dorm) => (
        <Link
          key={dorm.id}
          href={`/dorms/${dorm.id}`}
          className="block rounded-lg bg-gray-800 p-6 shadow hover:shadow-lg transition-shadow"
        >
          <div className="flex items-start justify-between mb-2">
            <h2 className="text-xl font-semibold text-white">{dorm.name}</h2>
            {userDormId === dorm.id && (
              <span className="rounded-full bg-blue-900/30 px-2 py-1 text-xs font-medium text-blue-200">
                Your House
              </span>
            )}
          </div>
          {dorm.description && (
            <p className="text-sm text-gray-400 mb-4 line-clamp-2">{dorm.description}</p>
          )}
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>{dorm.total_members} members</span>
            <span>View Details →</span>
          </div>
        </Link>
      ))}
    </div>
  )
}
