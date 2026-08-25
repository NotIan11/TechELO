import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/layout/AppShell'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import GameIcon, { gameLabel } from '@/components/ui/GameIcon'
import HouseChip from '@/components/ui/HouseChip'
import Sparkline from '@/components/ui/Sparkline'
import WinLossDots from '@/components/ui/WinLossDots'
import MatchCard, { type MatchWithPlayers } from '@/components/match/MatchCard'
import PokerProfileSection from '@/components/poker/PokerProfileSection'
import { formatDate, cn } from '@/lib/utils'
import { ratingHistory, recentForm, currentStreak } from '@/lib/stats'
import type { PlayerRef, PokerCountedEntry } from '@/lib/poker/types'

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isOwnProfile = user?.id === id

  const [{ data: profile }, { data: eloRatings }, { data: matches }, { data: pokerRows }] = await Promise.all([
    supabase
      .from('users')
      .select('*, dorms (id, name)')
      .eq('id', id)
      .single(),
    supabase.from('elo_ratings').select('*').eq('user_id', id),
    supabase
      .from('matches')
      .select(`
        *,
        player1:users!player1_id(id, display_name, profile_image_url),
        player2:users!player2_id(id, display_name, profile_image_url)
      `)
      .or(`player1_id.eq.${id},player2_id.eq.${id}`)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(100),
    supabase.from('poker_counted_entries').select('*').eq('user_id', id).order('played_at', { ascending: false }).limit(1000),
  ])

  if (!profile) {
    notFound()
  }

  // Poker: everyone at the same tables (for tablemates) + their display info
  const pokerEntries = (pokerRows ?? []) as PokerCountedEntry[]
  let tableEntries: PokerCountedEntry[] = []
  const pokerPlayers: Record<string, PlayerRef> = {}
  if (pokerEntries.length > 0) {
    const sessionIds = Array.from(new Set(pokerEntries.map((e) => e.session_id)))
    const { data: tableRows } = await supabase.from('poker_counted_entries').select('*').in('session_id', sessionIds).limit(5000)
    tableEntries = (tableRows ?? []) as PokerCountedEntry[]
    const ids = Array.from(new Set(tableEntries.map((e) => e.user_id)))
    const { data: users } = await supabase.from('users').select('id, display_name, profile_image_url').in('id', ids)
    for (const u of users ?? []) pokerPlayers[u.id] = { id: u.id, display_name: u.display_name, profile_image_url: u.profile_image_url }
  }

  const completedMatches = (matches ?? []) as MatchWithPlayers[]

  const games = (['pool', 'ping_pong'] as const).map((game) => {
    const rating = eloRatings?.find((r) => r.game_type === game)
    const history = ratingHistory(completedMatches as any, id, game)
    const form = recentForm(completedMatches as any, id, game)
    const streak = currentStreak(form)
    const played = rating?.matches_played ?? 0
    return {
      game,
      rating: rating?.rating ?? 1500,
      wins: rating?.wins ?? 0,
      losses: rating?.losses ?? 0,
      played,
      winRate: played > 0 ? Math.round(((rating?.wins ?? 0) / played) * 100) : 0,
      history,
      form,
      streak,
    }
  })

  return (
    <AppShell>
      {/* Header */}
      <Card className="mb-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <Avatar src={profile.profile_image_url} name={profile.display_name} size="xl" />
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
                {profile.display_name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-400">
                {profile.dorms ? (
                  <Link href={`/dorms/${profile.dorms.id}`} className="transition hover:opacity-80">
                    <HouseChip name={profile.dorms.name} />
                  </Link>
                ) : (
                  <span className="text-xs text-zinc-500">No house yet</span>
                )}
                <span className="text-xs text-zinc-500">
                  Member since {formatDate(profile.created_at)}
                </span>
              </div>
              {isOwnProfile && (
                <p className="mt-1 truncate text-xs text-zinc-600">{profile.university_email}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-3 sm:shrink-0">
            {isOwnProfile ? (
              <>
                <Button href="/profile/edit" variant="secondary">
                  Edit profile
                </Button>
                {!profile.dorms && <Button href="/profile/join-dorm">Join a house</Button>}
              </>
            ) : (
              user && <Button href={`/matches/new?opponent=${id}`}>Challenge</Button>
            )}
          </div>
        </div>
      </Card>

      {/* Per-game stats */}
      <div className="mb-6 grid gap-6 md:grid-cols-2">
        {games.map(({ game, rating, wins, losses, played, winRate, history, form, streak }) => (
          <Card key={game}>
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-white">
                <GameIcon
                  game={game}
                  className={cn('h-5 w-5', game === 'pool' ? 'text-pool' : 'text-pong')}
                />
                {gameLabel(game)}
              </h2>
              {streak && streak.count >= 2 && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                    streak.type === 'W'
                      ? 'bg-win/10 text-win'
                      : 'bg-loss/10 text-loss'
                  )}
                >
                  {streak.type === 'W' ? '🔥' : '🧊'} {streak.count} {streak.type === 'W' ? 'win' : 'loss'} streak
                </span>
              )}
            </div>

            <div className="mt-4 flex items-end justify-between gap-4">
              <div>
                <p className="tabular font-display text-4xl font-bold text-white">{rating}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {played > 0 ? `${played} matches played` : 'Unranked — play a match!'}
                </p>
              </div>
              <Sparkline
                values={history}
                className={game === 'pool' ? 'text-pool' : 'text-pong'}
              />
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/[0.06] pt-4 text-center">
              <div>
                <p className="tabular text-lg font-semibold text-win">{wins}</p>
                <p className="text-xs text-zinc-500">Wins</p>
              </div>
              <div>
                <p className="tabular text-lg font-semibold text-loss">{losses}</p>
                <p className="text-xs text-zinc-500">Losses</p>
              </div>
              <div>
                <p className="tabular text-lg font-semibold text-white">{winRate}%</p>
                <p className="text-xs text-zinc-500">Win rate</p>
              </div>
            </div>

            {form.length > 0 && (
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-zinc-500">Recent form</span>
                <WinLossDots form={form} />
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Poker */}
      <PokerProfileSection
        userId={id}
        displayName={profile.display_name}
        isOwnProfile={isOwnProfile}
        entries={pokerEntries}
        tableEntries={tableEntries}
        players={pokerPlayers}
      />

      {/* Match history */}
      <section>
        <h2 className="mb-3 eyebrow">
          Match history
        </h2>
        {completedMatches.length === 0 ? (
          <EmptyState
            icon={<GameIcon game="ping_pong" />}
            title="No completed matches yet"
            description={
              isOwnProfile
                ? 'Once you play and confirm a match, it shows up here with your rating change.'
                : `${profile.display_name} hasn't completed any matches yet.`
            }
            action={isOwnProfile ? <Button href="/matches/new">Start a match</Button> : undefined}
          />
        ) : (
          <div className="space-y-3">
            {completedMatches.slice(0, 15).map((match) => (
              <MatchCard key={match.id} match={match} viewerId={id} />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  )
}
