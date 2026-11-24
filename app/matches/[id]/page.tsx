import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import MatchDetails, { type HeadToHeadMatch } from '@/components/match/MatchDetails'
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

  const a = match.player1_id
  const b = match.player2_id
  const [{ data: ratingRows }, { data: historyRows }] = await Promise.all([
    // Ratings as they stand now: the two outcomes on the page are computed from these
    supabase.from('elo_ratings').select('user_id, rating').eq('game_type', match.game_type).in('user_id', [a, b]),
    supabase
      .from('matches')
      .select('id, player1_id, player2_id, winner_id, player1_elo_before, player2_elo_before, player1_elo_after, player2_elo_after, game_type, completed_at, created_at')
      .eq('game_type', match.game_type)
      .eq('status', 'completed')
      .or(`and(player1_id.eq.${a},player2_id.eq.${b}),and(player1_id.eq.${b},player2_id.eq.${a})`)
      .order('completed_at', { ascending: false })
      .limit(50),
  ])
  const ratings: Record<string, number> = {}
  for (const r of ratingRows ?? []) ratings[r.user_id] = r.rating

  // Spectators can view; only participants get action buttons (in MatchDetails)
  return (
    <AppShell width="4xl">
      <MatchDetails match={match} currentUserId={user.id} ratings={ratings} history={(historyRows ?? []) as HeadToHeadMatch[]} />
    </AppShell>
  )
}
