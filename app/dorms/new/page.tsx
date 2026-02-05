import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CreateDormForm from '@/components/dorm/CreateDormForm'
import NavBar from '@/components/layout/NavBar'

export default async function NewDormPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <NavBar />
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-white mb-8">Create New Dorm</h1>
        <CreateDormForm />
      </div>
    </div>
  )
}
