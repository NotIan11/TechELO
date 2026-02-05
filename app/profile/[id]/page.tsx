import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import NavBar from '@/components/layout/NavBar'

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isOwnProfile = user?.id === id

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select(`
      *,
      dorms (
        id,
        name,
        description
      )
    `)
    .eq('id', id)
    .single()

  if (!profile) {
    notFound()
  }

  // Get ELO ratings
  const { data: eloRatings } = await supabase
    .from('elo_ratings')
    .select('*')
    .eq('user_id', id)
    .order('game_type')

  // Get match history
  const { data: matches } = await supabase
    .from('matches')
    .select(`
      *,
      player1:users!player1_id(id, display_name),
      player2:users!player2_id(id, display_name)
    `)
    .or(`player1_id.eq.${id},player2_id.eq.${id}`)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(20)

  const poolRating = eloRatings?.find((r) => r.game_type === 'pool')
  const pingPongRating = eloRatings?.find((r) => r.game_type === 'ping_pong')

  // Calculate win rates
  const poolWinRate = poolRating && poolRating.matches_played > 0
    ? ((poolRating.wins / poolRating.matches_played) * 100).toFixed(1)
    : '0.0'
  const pingPongWinRate = pingPongRating && pingPongRating.matches_played > 0
    ? ((pingPongRating.wins / pingPongRating.matches_played) * 100).toFixed(1)
    : '0.0'

  return (
    <div className="min-h-screen bg-gray-900">
      <NavBar />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="rounded-lg bg-gray-800 p-6 shadow mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-4">
                <h1 className="text-3xl font-bold text-white">{profile.display_name}</h1>
                {isOwnProfile && (
                  <Link
                    href="/profile/edit"
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                  >
                    Edit Profile
                  </Link>
                )}
              </div>
              <p className="mt-1 text-gray-400">{profile.university_email}</p>
              {profile.dorms && (
                <Link
                  href={`/dorms/${profile.dorms.id}`}
                  className="mt-2 inline-block text-blue-400 hover:text-blue-300"
                >
                  {profile.dorms.name}
                </Link>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Member since</p>
              <p className="text-sm font-medium text-white">{new Date(profile.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* ELO Ratings */}
        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <div className="rounded-lg bg-gray-800 p-6 shadow">
            <h2 className="text-xl font-semibold text-white mb-4">Pool Statistics</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-400">Current Rating</p>
                <p className="text-3xl font-bold text-blue-400">
                  {poolRating?.rating || 1500}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-700">
                <div>
                  <p className="text-sm text-gray-400">Matches</p>
                  <p className="text-lg font-semibold text-white">{poolRating?.matches_played || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Wins</p>
                  <p className="text-lg font-semibold text-green-400">{poolRating?.wins || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Losses</p>
                  <p className="text-lg font-semibold text-red-400">{poolRating?.losses || 0}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-400">Win Rate</p>
                <p className="text-lg font-semibold text-white">{poolWinRate}%</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-gray-800 p-6 shadow">
            <h2 className="text-xl font-semibold text-white mb-4">Ping Pong Statistics</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-400">Current Rating</p>
                <p className="text-3xl font-bold text-green-400">
                  {pingPongRating?.rating || 1500}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-700">
                <div>
                  <p className="text-sm text-gray-400">Matches</p>
                  <p className="text-lg font-semibold text-white">{pingPongRating?.matches_played || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Wins</p>
                  <p className="text-lg font-semibold text-green-400">{pingPongRating?.wins || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Losses</p>
                  <p className="text-lg font-semibold text-red-400">{pingPongRating?.losses || 0}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-400">Win Rate</p>
                <p className="text-lg font-semibold text-white">{pingPongWinRate}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Match History */}
        <div className="rounded-lg bg-gray-800 p-6 shadow">
          <h2 className="text-xl font-semibold text-white mb-4">Recent Match History</h2>
          {!matches || matches.length === 0 ? (
            <p className="text-gray-400">No completed matches yet.</p>
          ) : (
            <div className="space-y-4">
              {matches.map((match: any) => {
                const isPlayer1 = match.player1_id === id
                const opponent = isPlayer1 ? match.player2 : match.player1
                const won = match.winner_id === id
                const eloChange = isPlayer1
                  ? (match.player1_elo_after || 0) - (match.player1_elo_before || 0)
                  : (match.player2_elo_after || 0) - (match.player2_elo_before || 0)

                return (
                  <Link
                    key={match.id}
                    href={`/matches/${match.id}`}
                    className="block rounded-md border border-gray-700 p-4 hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white capitalize">{match.game_type}</span>
                          <span className="text-gray-500">•</span>
                          <span className="text-sm text-gray-400">vs {opponent.display_name}</span>
                        </div>
                        <p className="mt-1 text-xs text-gray-400">
                          {formatDateTime(match.completed_at || match.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-semibold ${won ? 'text-green-400' : 'text-red-400'}`}>
                          {won ? 'W' : 'L'}
                        </span>
                        <p className={`text-xs ${eloChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {eloChange >= 0 ? '+' : ''}{eloChange}
                        </p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
