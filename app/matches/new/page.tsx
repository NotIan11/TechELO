import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CreateMatchForm from '@/components/match/CreateMatchForm'
import NavBar from '@/components/layout/NavBar'

export default async function NewMatchPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get all users for opponent selection
  const { data: users } = await supabase
    .from('users')
    .select('id, display_name')
    .neq('id', user.id)
    .order('display_name')

  return (
    <div className="min-h-screen bg-gray-900">
      <NavBar />
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-white mb-8">Start New Match</h1>
        <CreateMatchForm users={users || []} />
      </div>
    </div>
  )
}
