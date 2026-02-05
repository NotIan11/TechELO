import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DormList from '@/components/dorm/DormList'
import NavBar from '@/components/layout/NavBar'

export default async function DormsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get all dorms
  const { data: dorms } = await supabase
    .from('dorms')
    .select('*')
    .order('name')

  // Get user's current dorm
  const { data: userProfile } = await supabase
    .from('users')
    .select('dorm_id')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-900">
      <NavBar />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Dorms</h1>
          <Link
            href="/dorms/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Create New Dorm
          </Link>
        </div>
        <DormList dorms={dorms || []} userDormId={userProfile?.dorm_id || null} />
      </div>
    </div>
  )
}
