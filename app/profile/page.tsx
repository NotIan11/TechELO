import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NavBar from '@/components/layout/NavBar'
import { getHouseColor } from '@/lib/utils'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select(`
      *,
      dorms (
        name
      )
    `)
    .eq('id', user.id)
    .single()

  // Get user's ELO ratings
  const { data: eloRatings } = await supabase
    .from('elo_ratings')
    .select('*')
    .eq('user_id', user.id)

  // Get recent matches
  const { data: recentMatches } = await supabase
    .from('matches')
    .select(`
      *,
      player1:users!player1_id(display_name),
      player2:users!player2_id(display_name)
    `)
    .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .limit(5)

  const poolRating = eloRatings?.find((r) => r.game_type === 'pool')
  const pingPongRating = eloRatings?.find((r) => r.game_type === 'ping_pong')

  return (
    <div className="min-h-screen bg-gray-900">
      <NavBar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {profile?.profile_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.profile_image_url}
                alt={profile.display_name ?? 'Profile'}
                width={64}
                height={64}
                className="rounded-full"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center">
                <span className="text-white text-2xl font-semibold">
                  {profile?.display_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-white">Profile</h1>
              <p className="mt-1 text-gray-400">
                {profile?.display_name || user.email}
              </p>
            </div>
          </div>
          <Link
            href="/profile/edit"
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Edit Profile
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* ELO Ratings Cards */}
          <div className="rounded-lg bg-gray-800 p-6 shadow">
            <h2 className="text-lg font-semibold text-white">Pool Rating</h2>
            <p className="mt-2 text-3xl font-bold text-blue-400">
              {poolRating?.rating || 1500}
            </p>
            <p className="mt-1 text-sm text-gray-400">
              {poolRating?.wins || 0}W - {poolRating?.losses || 0}L
            </p>
          </div>

          <div className="rounded-lg bg-gray-800 p-6 shadow">
            <h2 className="text-lg font-semibold text-white">Ping Pong Rating</h2>
            <p className="mt-2 text-3xl font-bold text-green-400">
              {pingPongRating?.rating || 1500}
            </p>
            <p className="mt-1 text-sm text-gray-400">
              {pingPongRating?.wins || 0}W - {pingPongRating?.losses || 0}L
            </p>
          </div>

          <div
            className="rounded-lg bg-gray-800 p-6 shadow border-l-4"
            style={{ borderLeftColor: getHouseColor(profile?.dorms?.name ?? undefined) }}
          >
            <h2 className="text-lg font-semibold text-white">House</h2>
            <p className="mt-2 text-lg text-gray-300">
              {profile?.dorms?.name || 'No house assigned'}
            </p>
            <Link
              href={profile?.dorms ? "/dorms" : "/profile/join-dorm"}
              className="mt-2 text-sm text-blue-400 hover:text-blue-300"
            >
              {profile?.dorms ? 'Change house' : 'Join a house'}
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-white">Quick Actions</h2>
          <div className="mt-4 flex flex-wrap gap-4">
            <Link
              href="/matches/new"
              className="rounded-md bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
            >
              Start New Match
            </Link>
            <Link
              href="/matches"
              className="rounded-md bg-gray-700 px-6 py-3 text-gray-300 hover:bg-gray-600"
            >
              View Match History
            </Link>
            <Link
              href="/"
              className="rounded-md bg-gray-700 px-6 py-3 text-gray-300 hover:bg-gray-600"
            >
              View Leaderboard
            </Link>
          </div>
        </div>

        {/* Recent Matches */}
        {recentMatches && recentMatches.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-white">Recent Matches</h2>
            <div className="mt-4 space-y-4">
              {recentMatches.map((match: any) => (
                <div key={match.id} className="rounded-lg bg-gray-800 p-4 shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">
                        {match.player1.display_name} vs {match.player2.display_name}
                      </p>
                      <p className="text-sm text-gray-400 capitalize">{match.game_type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-white capitalize">
                        {match.status.replace('_', ' ')}
                      </p>
                      {match.winner_id && (
                        <p className="text-xs text-gray-400">
                          Winner: {match.winner_id === match.player1_id ? match.player1.display_name : match.player2.display_name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
