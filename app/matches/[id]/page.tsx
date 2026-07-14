import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import MatchDetails from '@/components/match/MatchDetails'
import AppShell from '@/components/layout/AppShell'

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?redirect=/matches/${id}`)
  }

  const { data: match, error } = await supabase
    .from('matches')
    .select(`
      *,
      player1:users!player1_id(id, display_name, profile_image_url),
      player2:users!player2_id(id, display_name, profile_image_url)
    `)
    .eq('id', id)
    .single()

  if (error || !match) {
    notFound()
  }

  // Spectators can view; only participants get action buttons (in MatchDetails)
  return (
    <AppShell width="4xl">
      <MatchDetails match={match} currentUserId={user.id} />
    </AppShell>
  )
}
