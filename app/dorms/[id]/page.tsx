import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import DormDetails from '@/components/dorm/DormDetails'
import NavBar from '@/components/layout/NavBar'

export default async function DormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get dorm details
  const { data: dorm } = await supabase
    .from('dorms')
    .select('*')
    .eq('id', id)
    .single()

  if (!dorm) {
    notFound()
  }

  // Get dorm members
  const { data: members } = await supabase
    .from('users')
    .select('id, display_name, university_email, profile_image_url, created_at')
    .eq('dorm_id', id)
    .order('display_name')

  // Get user's current dorm
  const { data: userProfile } = await supabase
    .from('users')
    .select('dorm_id')
    .eq('id', user.id)
    .single()

  const isMember = userProfile?.dorm_id === id

  // Get dorm leaderboard for both game types
  const { data: poolLeaderboard } = await supabase.rpc('get_leaderboard', {
    p_game_type: 'pool',
    p_limit: 10,
    p_offset: 0,
    p_dorm_id: id,
  })

  const { data: pingPongLeaderboard } = await supabase.rpc('get_leaderboard', {
    p_game_type: 'ping_pong',
    p_limit: 10,
    p_offset: 0,
    p_dorm_id: id,
  })

  // Get dorm statistics
  const { data: poolStats } = await supabase
    .from('elo_ratings')
    .select('rating, wins, losses, matches_played')
    .eq('game_type', 'pool')
    .in('user_id', members?.map((m) => m.id) || [])

  const { data: pingPongStats } = await supabase
    .from('elo_ratings')
    .select('rating, wins, losses, matches_played')
    .eq('game_type', 'ping_pong')
    .in('user_id', members?.map((m) => m.id) || [])

  const totalPoolMatches = poolStats?.reduce((sum, stat) => sum + stat.matches_played, 0) || 0
  const totalPingPongMatches = pingPongStats?.reduce((sum, stat) => sum + stat.matches_played, 0) || 0
  const avgPoolRating = poolStats && poolStats.length > 0
    ? Math.round(poolStats.reduce((sum, stat) => sum + stat.rating, 0) / poolStats.length)
    : 0
  const avgPingPongRating = pingPongStats && pingPongStats.length > 0
    ? Math.round(pingPongStats.reduce((sum, stat) => sum + stat.rating, 0) / pingPongStats.length)
    : 0

  return (
    <div className="min-h-screen bg-gray-900">
      <NavBar />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <DormDetails
          dorm={dorm}
          members={members || []}
          isMember={isMember}
          poolLeaderboard={poolLeaderboard || []}
          pingPongLeaderboard={pingPongLeaderboard || []}
          stats={{
            totalMembers: members?.length || 0,
            totalPoolMatches,
            totalPingPongMatches,
            avgPoolRating,
            avgPingPongRating,
          }}
        />
      </div>
    </div>
  )
}
