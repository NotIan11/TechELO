import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDateTime } from '@/lib/utils'
import NavBar from '@/components/layout/NavBar'

export default async function MatchesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get all matches for the user
  const { data: matches } = await supabase
    .from('matches')
    .select(`
      *,
      player1:users!player1_id(id, display_name),
      player2:users!player2_id(id, display_name)
    `)
    .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .limit(50)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_start':
        return 'bg-yellow-900/30 text-yellow-200'
      case 'in_progress':
        return 'bg-blue-900/30 text-blue-200'
      case 'pending_result':
        return 'bg-purple-900/30 text-purple-200'
      case 'completed':
        return 'bg-green-900/30 text-green-200'
      case 'disputed':
        return 'bg-red-900/30 text-red-200'
      case 'cancelled':
      case 'challenge_expired':
        return 'bg-gray-700 text-gray-400'
      default:
        return 'bg-gray-700 text-gray-200'
    }
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <NavBar />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-bold text-white">Match History</h1>
          <Link
            href="/matches/new"
            className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-blue-600 px-4 py-3 text-white hover:bg-blue-700 sm:shrink-0"
          >
            New Match
          </Link>
        </div>

        {!matches || matches.length === 0 ? (
          <div className="rounded-lg bg-gray-800 p-8 text-center shadow">
            <p className="text-gray-400">No matches yet. Start your first match!</p>
            <Link
              href="/matches/new"
              className="mt-4 inline-flex min-h-[44px] items-center rounded-md bg-blue-600 px-4 py-3 text-white hover:bg-blue-700"
            >
              Create Match
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match: any) => (
              <Link
                key={match.id}
                href={`/matches/${match.id}`}
                className="block rounded-lg bg-gray-800 p-6 shadow hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(match.status)}`}>
                        {match.status === 'challenge_expired' ? 'Challenge expired' : match.status === 'cancelled' ? 'Cancelled' : match.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-400 capitalize">{match.game_type}</span>
                    </div>
                    <h2 className="mt-2 text-lg font-semibold text-white">
                      {match.player1.display_name} vs {match.player2.display_name}
                    </h2>
                    <p className="mt-1 text-sm text-gray-400">
                      {formatDateTime(match.created_at)}
                    </p>
                    {match.winner_id && (
                      <p className="mt-2 text-sm text-green-400">
                        Winner: {match.winner_id === match.player1_id ? match.player1.display_name : match.player2.display_name}
                      </p>
                    )}
                  </div>
                  {(match.player1_elo_after && match.player2_elo_after) && (
                    <div className="text-sm sm:text-right border-t border-gray-700 pt-4 sm:border-t-0 sm:pt-0">
                      <p className="text-gray-300">
                        {match.player1.display_name}: {match.player1_elo_before} → {match.player1_elo_after}
                      </p>
                      <p className="text-gray-300">
                        {match.player2.display_name}: {match.player2_elo_before} → {match.player2_elo_after}
                      </p>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
