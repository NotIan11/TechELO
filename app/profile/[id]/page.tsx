import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/layout/AppShell'
import SignOutButton from '@/components/auth/SignOutButton'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import GameIcon, { gameLabel } from '@/components/ui/GameIcon'
import HouseChip from '@/components/ui/HouseChip'
import PageHeader from '@/components/ui/PageHeader'
import SectionHeader from '@/components/ui/SectionHeader'
import Sparkline from '@/components/ui/Sparkline'
import StatTile from '@/components/ui/StatTile'
import StreakChip from '@/components/ui/StreakChip'
import TextLink from '@/components/ui/TextLink'
import WinLossDots from '@/components/ui/WinLossDots'
import MatchCard, { type MatchWithPlayers } from '@/components/match/MatchCard'
import PokerProfileSection from '@/components/poker/PokerProfileSection'
import { formatDate } from '@/lib/utils'
import { ratingHistory, recentForm, currentStreak } from '@/lib/stats'
import type { PlayerRef, PokerCountedEntry } from '@/lib/poker/types'

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isOwnProfile = user?.id === id

  const [{ data: profile }, { data: eloRatings }, { data: matches }, { data: pokerRows }] = await Promise.all([
    supabase.from('users').select('*, dorms (id, name)').eq('id', id).single(),
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
      <PageHeader
        size="md"
        leading={<Avatar src={profile.profile_image_url} name={profile.display_name} size="xl" />}
        title={<span className="text-2xl sm:text-3xl">{profile.display_name}</span>}
        meta={
          <>
            {profile.dorms ? (
              <Link href={`/dorms/${profile.dorms.id}`} className="transition hover:opacity-80">
                <HouseChip name={profile.dorms.name} />
              </Link>
            ) : (
              <span>No house yet</span>
            )}
            <span>· member since {formatDate(profile.created_at)}</span>
            {isOwnProfile && <span className="truncate">· {profile.university_email}</span>}
          </>
        }
        actions={
          isOwnProfile ? (
            <>
              <Button href="/profile/edit" variant="secondary">
                Edit profile
              </Button>
              {!profile.dorms && <Button href="/profile/join-dorm">Join a house</Button>}
              <SignOutButton />
            </>
          ) : (
            user && <Button href={`/matches/new?opponent=${id}`}>Challenge</Button>
          )
        }
        className="mb-8"
      />

      <div className="mb-6 grid gap-6 md:grid-cols-2">
        {games.map(({ game, rating, wins, losses, played, winRate, history, form, streak }) => (
          <Card key={game}>
            <div className="flex items-center justify-between gap-3">
              <Link href={`/leaderboard?game_type=${game}`} className="flex items-center gap-2 font-display text-lg font-semibold text-white transition hover:text-orange-400">
                <GameIcon game={game} className="text-orange-400" />
                {gameLabel(game)}
              </Link>
              {streak && streak.count >= 2 && <StreakChip type={streak.type} count={streak.count} />}
            </div>

            <div className="mt-4 flex items-end justify-between gap-4">
              <div>
                <p className="tabular font-display text-4xl font-bold tracking-tight text-white">{rating}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {played > 0 ? (
                    `${played} matches played`
                  ) : isOwnProfile ? (
                    <>
                      Unranked. One confirmed match puts you on the board.{' '}
                      <TextLink href="/matches/new" arrow="right" className="text-xs">
                        Play
                      </TextLink>
                    </>
                  ) : (
                    'Unranked'
                  )}
                </p>
              </div>
              <Sparkline values={history} className="text-orange-400" />
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4 text-center">
              <StatTile bare size="sm" label="Wins" value={wins} tone={wins > 0 ? 'win' : 'muted'} />
              <StatTile bare size="sm" label="Losses" value={losses} tone={losses > 0 ? 'loss' : 'muted'} />
              <StatTile bare size="sm" label="Win rate" value={`${winRate}%`} />
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

      <PokerProfileSection userId={id} displayName={profile.display_name} isOwnProfile={isOwnProfile} entries={pokerEntries} tableEntries={tableEntries} players={pokerPlayers} />

      <section>
        <SectionHeader title="Match history" />
        {completedMatches.length === 0 ? (
          <EmptyState
            icon={<GameIcon game="ping_pong" />}
            title="No completed matches"
            description={isOwnProfile ? 'Confirmed matches show up here with the rating change.' : `${profile.display_name} has not completed any matches yet.`}
            action={isOwnProfile ? <Button href="/matches/new">Challenge someone</Button> : undefined}
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
