import { createClient } from '@/lib/supabase/server'
import LeaderboardClient from '@/components/leaderboard/LeaderboardClient'
import NavBar from '@/components/layout/NavBar'

export default async function Home({
  searchParams,
}: {
  searchParams: { game_type?: string; page?: string; dorm_id?: string }
}) {
  const supabase = await createClient()
  const gameType = (searchParams.game_type as 'pool' | 'ping_pong') || 'pool'
  const page = parseInt(searchParams.page || '1')
  const dormId = searchParams.dorm_id || null
  const limit = 50
  const offset = (page - 1) * limit

  // Get leaderboard using the database function
  const { data: leaderboard, error } = await supabase.rpc('get_leaderboard', {
    p_game_type: gameType,
    p_limit: limit,
    p_offset: offset,
    p_dorm_id: dormId,
  })

  // Get total count for pagination
  const { count } = await supabase
    .from('elo_ratings')
    .select('*', { count: 'exact', head: true })
    .eq('game_type', gameType)

  // Get all dorms for filter
  const { data: dorms } = await supabase
    .from('dorms')
    .select('id, name')
    .order('name')

  const totalPages = Math.ceil((count || 0) / limit)

  return (
    <div className="min-h-screen bg-gray-900">
      <NavBar />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-white mb-4">HouseRank</h1>
        </div>
        <LeaderboardClient
          leaderboard={leaderboard || []}
          gameType={gameType}
          currentPage={page}
          totalPages={totalPages}
          dorms={dorms || []}
          selectedDormId={dormId}
        />
      </div>
    </div>
  )
}
