import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import MatchDetails from '@/components/match/MatchDetails'
import NavBar from '@/components/layout/NavBar'

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get match with player details
  const { data: match, error } = await supabase
    .from('matches')
    .select(`
      *,
      player1:users!player1_id(id, display_name),
      player2:users!player2_id(id, display_name)
    `)
    .eq('id', id)
    .single()

  if (error || !match) {
    notFound()
  }

  // Verify user is part of the match
  if (match.player1_id !== user.id && match.player2_id !== user.id) {
    redirect('/matches')
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <NavBar />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <MatchDetails match={match} currentUserId={user.id} />
      </div>
    </div>
  )
}
