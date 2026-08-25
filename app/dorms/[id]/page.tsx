import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import DormDetails from '@/components/dorm/DormDetails'
import AppShell from '@/components/layout/AppShell'
import { periodBounds } from '@/lib/poker/periods'

export default async function DormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?redirect=/dorms/${id}`)
  }

  const { data: dorm } = await supabase
    .from('dorms')
    .select('*')
    .eq('id', id)
    .single()

  if (!dorm) {
    notFound()
  }

  const { since: termSince } = periodBounds('term')
  const [
    { data: members },
    { data: userProfile },
    { data: poolLeaderboard },
    { data: pingPongLeaderboard },
    { data: pokerLeaderboard },
  ] = await Promise.all([
    supabase
      .from('users')
      .select('id, display_name, university_email, profile_image_url, created_at')
      .eq('dorm_id', id)
      .order('display_name'),
    supabase.from('users').select('dorm_id').eq('id', user.id).single(),
    supabase.rpc('get_leaderboard', { p_game_type: 'pool', p_limit: 10, p_offset: 0, p_dorm_id: id }),
    supabase.rpc('get_leaderboard', { p_game_type: 'ping_pong', p_limit: 10, p_offset: 0, p_dorm_id: id }),
    // Tolerates a DB without migration 013 (data is null on error)
    supabase.rpc('get_poker_leaderboard', {
      p_kind: null,
      p_dorm_id: id,
      p_since: termSince,
      p_until: null,
      p_sort: 'net',
      p_min_sessions: 1,
      p_limit: 10,
      p_offset: 0,
    }),
  ])

  const isMember = userProfile?.dorm_id === id
  const memberIds = members?.map((m) => m.id) || []

  const [{ data: poolStats }, { data: pingPongStats }] = await Promise.all([
    supabase
      .from('elo_ratings')
      .select('rating, wins, losses, matches_played')
      .eq('game_type', 'pool')
      .in('user_id', memberIds),
    supabase
      .from('elo_ratings')
      .select('rating, wins, losses, matches_played')
      .eq('game_type', 'ping_pong')
      .in('user_id', memberIds),
  ])

  const totalPoolMatches = poolStats?.reduce((sum, stat) => sum + stat.matches_played, 0) || 0
  const totalPingPongMatches = pingPongStats?.reduce((sum, stat) => sum + stat.matches_played, 0) || 0
  const rankedPool = (poolStats ?? []).filter((s) => s.matches_played > 0)
  const rankedPong = (pingPongStats ?? []).filter((s) => s.matches_played > 0)
  const avgPoolRating =
    rankedPool.length > 0
      ? Math.round(rankedPool.reduce((sum, stat) => sum + stat.rating, 0) / rankedPool.length)
      : 0
  const avgPingPongRating =
    rankedPong.length > 0
      ? Math.round(rankedPong.reduce((sum, stat) => sum + stat.rating, 0) / rankedPong.length)
      : 0

  // get_leaderboard doesn't return avatars; the members list has them
  const avatarMap = Object.fromEntries((members ?? []).map((m) => [m.id, m.profile_image_url]))
  const withAvatars = (rows: any[] | null) =>
    (rows ?? []).map((r) => ({ ...r, profile_image_url: avatarMap[r.user_id] ?? null }))

  return (
    <AppShell>
      <DormDetails
        dorm={dorm}
        members={members || []}
        isMember={isMember}
        poolLeaderboard={withAvatars(poolLeaderboard)}
        pingPongLeaderboard={withAvatars(pingPongLeaderboard)}
        pokerLeaderboard={((pokerLeaderboard ?? []) as any[]).map((r) => ({
          rank: Number(r.rank),
          user_id: r.user_id,
          display_name: r.display_name,
          profile_image_url: r.profile_image_url ?? avatarMap[r.user_id] ?? null,
          net_cents: Number(r.net_cents),
          sessions_played: Number(r.sessions_played),
        }))}
        stats={{
          totalMembers: members?.length || 0,
          totalPoolMatches,
          totalPingPongMatches,
          avgPoolRating,
          avgPingPongRating,
        }}
      />
    </AppShell>
  )
}
