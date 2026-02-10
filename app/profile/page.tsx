import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NavBar from '@/components/layout/NavBar'
import { getHouseColor, getHouseTextColor } from '@/lib/utils'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  let { data: profile, error: profileError } = await supabase
    .from('users')
    .select(`
      *,
      dorms (
        name
      )
    `)
    .eq('id', user.id)
    .single()

  // If authenticated but no row in users (e.g. trigger/callback didn't run), create it now
  if (!profile && profileError?.code === 'PGRST116') {
    const email = (user.email ?? '').toLowerCase()
    const firstName = user.user_metadata?.first_name ?? ''
    const lastName = user.user_metadata?.last_name ?? ''
    const displayName =
      firstName && lastName ? `${firstName} ${lastName}`.trim() : email.split('@')[0] || 'User'
    const { error: createError } = await supabase.rpc('create_user_profile', {
      p_user_id: user.id,
      p_university_email: email,
      p_display_name: displayName,
      p_first_name: firstName || null,
      p_last_name: lastName || null,
    })
    if (!createError) {
      redirect('/profile') // refetch so profile is loaded
    }
    // If RPC failed (e.g. function not in DB), continue and show profile with empty data; they may need to complete signup
  }

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
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {profile?.profile_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.profile_image_url}
                alt={profile.display_name ?? 'Profile'}
                width={64}
                height={64}
                className="rounded-full shrink-0"
              />
            ) : (
              <div className="w-16 h-16 shrink-0 rounded-full bg-gray-700 flex items-center justify-center">
                <span className="text-white text-2xl font-semibold">
                  {profile?.display_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-3xl font-bold text-white">Profile</h1>
              <p className="mt-1 text-gray-400 truncate">
                {profile?.display_name || user.email}
              </p>
            </div>
          </div>
          <Link
            href="/profile/edit"
            className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-blue-600 px-4 py-3 text-white hover:bg-blue-700 sm:shrink-0"
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
            className={`rounded-lg p-6 shadow ${getHouseTextColor(profile?.dorms?.name ?? undefined) === 'black' ? 'text-gray-900' : 'text-white'}`}
            style={{ backgroundColor: getHouseColor(profile?.dorms?.name ?? undefined) }}
          >
            <h2 className="text-lg font-semibold">House</h2>
            <p className={`mt-2 text-lg ${getHouseTextColor(profile?.dorms?.name ?? undefined) === 'black' ? 'text-gray-800' : 'text-white/90'}`}>
              {profile?.dorms?.name || 'No house assigned'}
            </p>
            <Link
              href={profile?.dorms ? "/dorms" : "/profile/join-dorm"}
              className={`mt-2 text-sm underline ${getHouseTextColor(profile?.dorms?.name ?? undefined) === 'black' ? 'text-gray-800 hover:text-gray-900' : 'text-white/90 hover:text-white'}`}
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
              className="inline-flex min-h-[44px] items-center rounded-md bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
            >
              Start New Match
            </Link>
            <Link
              href="/matches"
              className="inline-flex min-h-[44px] items-center rounded-md bg-gray-700 px-6 py-3 text-gray-300 hover:bg-gray-600"
            >
              View Match History
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center rounded-md bg-gray-700 px-6 py-3 text-gray-300 hover:bg-gray-600"
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
              {recentMatches.map((match: any) => {
                const isWin = match.status === 'completed' && match.winner_id === user.id
                const isLoss = match.status === 'completed' && match.winner_id != null && match.winner_id !== user.id
                const isDisputed = match.status === 'disputed'
                const cardBg = isWin
                  ? 'bg-green-900/30'
                  : isLoss
                    ? 'bg-red-900/30'
                    : isDisputed
                      ? 'bg-yellow-900/30'
                      : 'bg-gray-800'
                return (
                <div key={match.id} className={`rounded-lg ${cardBg} p-4 shadow`}>
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
              );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
