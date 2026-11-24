import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/layout/AppShell'
import SignOutButton from '@/components/auth/SignOutButton'
import PlayerBoard from '@/components/profile/PlayerBoard'
import MostPlayed from '@/components/profile/MostPlayed'
import { FIGURE_CELL, GAME_NAMES, buildFeed, buildRivals, gameTrend, sinceLabel, type ProfileMatch, type TableGame } from '@/components/profile/activity'
import Button from '@/components/ui/Button'
import Figure from '@/components/ui/Figure'
import HouseChip from '@/components/ui/HouseChip'
import PageIntro from '@/components/ui/PageIntro'
import Sparkline from '@/components/ui/Sparkline'
import TextLink from '@/components/ui/TextLink'
import WinLossDots from '@/components/ui/WinLossDots'
import { tablemates } from '@/lib/poker/stats'
import type { PlayerRef, PokerCountedEntry } from '@/lib/poker/types'
import { cn } from '@/lib/utils'

const TABLE_GAMES: TableGame[] = ['pool', 'ping_pong']

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
  const pokerPlayers = new Map<string, PlayerRef>()
  if (pokerEntries.length > 0) {
    const sessionIds = Array.from(new Set(pokerEntries.map((e) => e.session_id)))
    const { data: tableRows } = await supabase.from('poker_counted_entries').select('*').in('session_id', sessionIds).limit(5000)
    tableEntries = (tableRows ?? []) as PokerCountedEntry[]
    const ids = Array.from(new Set(tableEntries.map((e) => e.user_id).filter((id): id is string => id != null)))
    const { data: users } = await supabase.from('users').select('id, display_name, profile_image_url').in('id', ids)
    for (const u of users ?? []) pokerPlayers.set(u.id, { id: u.id, display_name: u.display_name, profile_image_url: u.profile_image_url })
  }

  const completedMatches = (matches ?? []) as ProfileMatch[]

  // Rank the way the leaderboard does: higher rating first, wins break ties; only players with a match count
  const games = await Promise.all(
    TABLE_GAMES.map(async (game) => {
      const row = eloRatings?.find((r) => r.game_type === game)
      const played: number = row?.matches_played ?? 0
      const rating: number = row?.rating ?? 1500
      const wins: number = row?.wins ?? 0
      const losses: number = row?.losses ?? 0
      let rank: number | null = null
      let ranked: number | null = null
      if (played > 0) {
        const [{ count: above }, { count: tied }, { count: total }] = await Promise.all([
          supabase.from('elo_ratings').select('*', { count: 'exact', head: true }).eq('game_type', game).gt('matches_played', 0).gt('rating', rating),
          supabase.from('elo_ratings').select('*', { count: 'exact', head: true }).eq('game_type', game).gt('matches_played', 0).eq('rating', rating).gt('wins', wins),
          supabase.from('elo_ratings').select('*', { count: 'exact', head: true }).eq('game_type', game).gt('matches_played', 0),
        ])
        rank = 1 + (above ?? 0) + (tied ?? 0)
        ranked = total ?? null
      }
      return { game, played, rating, wins, losses, rank, ranked, winRate: played > 0 ? Math.round((wins / played) * 100) : 0, ...gameTrend(completedMatches, id, game, rating) }
    })
  )

  const feed = buildFeed(completedMatches, pokerEntries, id, isOwnProfile)
  const rivals = buildRivals(completedMatches, id, tablemates(id, tableEntries, pokerPlayers, 1000))
  const firstName = profile.display_name.trim().split(/\s+/)[0] || profile.display_name

  return (
    <AppShell>
      <PageIntro
        kicker={
          <>
            {profile.dorms ? (
              <Link href={`/dorms/${profile.dorms.id}`} className="inline-flex min-h-[24px] items-center transition hover:text-white">
                <HouseChip name={profile.dorms.name} className="text-[13px] text-inherit" />
              </Link>
            ) : (
              <span>No house yet</span>
            )}
            <span>· playing since {sinceLabel(profile.created_at)}</span>
          </>
        }
        title={profile.display_name}
        actions={
          isOwnProfile ? (
            <>
              <Button href="/profile/edit" variant="secondary">
                Edit
              </Button>
              {!profile.dorms && (
                <Button href="/profile/join-dorm" variant="secondary">
                  Join a house
                </Button>
              )}
              <SignOutButton />
            </>
          ) : (
            user && <Button href={`/play?opponent=${id}`}>Challenge</Button>
          )
        }
      />

      <PlayerBoard
        displayName={profile.display_name}
        isOwnProfile={isOwnProfile}
        feed={feed}
        entries={pokerEntries}
        aside={<MostPlayed rows={rivals} subject={isOwnProfile ? 'you' : firstName} />}
        tableFigures={games.map(({ game, played, rating, wins, losses, rank, ranked, winRate, history, peak, change30, form, streak }) => (
          <div key={game} className={FIGURE_CELL}>
            {played === 0 ? (
              <Figure
                label={<GameLink game={game} />}
                aside="Unranked"
                value={rating}
                tone="muted"
                size="lg"
              >
                <p className="mt-4 max-w-[280px]">{isOwnProfile ? 'Unranked. One confirmed match puts you on the board.' : 'Unranked'}</p>
                {isOwnProfile && (
                  <TextLink href={`/play?game_type=${game}`} className="min-h-[44px] text-[13px]">
                    Play
                  </TextLink>
                )}
              </Figure>
            ) : (
              <Figure
                label={<GameLink game={game} />}
                aside={
                  <span className="tabular">
                    {rank != null && (
                      <>
                        #{rank}
                        {ranked != null && <span className="font-sans"> of </span>}
                        {ranked}
                        <span className="font-sans"> · </span>
                      </>
                    )}
                    {wins}–{losses}
                  </span>
                }
                value={rating}
                size="lg"
              >
                {history.length >= 2 && <Sparkline values={history} width={320} height={48} className="mt-4 h-auto w-full text-white" />}
                <p className="mt-2 flex flex-wrap justify-between gap-x-3 text-xs text-mute">
                  <span>
                    {peak != null && (
                      <>
                        Peak <span className="tabular">{peak}</span> ·{' '}
                      </>
                    )}
                    <span className="tabular">{winRate}%</span> won
                  </span>
                  {change30 != null && (
                    <span className={cn('tabular', change30 > 0 ? 'text-win' : change30 < 0 ? 'text-loss' : undefined)}>
                      {change30 > 0 ? '+' : change30 < 0 ? '−' : ''}
                      {Math.abs(change30)} in 30 days
                    </span>
                  )}
                </p>
                {(form.length > 0 || (streak && streak.count >= 2)) && (
                  <p className="mt-1 flex flex-wrap items-center justify-between gap-x-3 text-xs">
                    {streak && streak.count >= 2 ? (
                      <span className={streak.type === 'W' ? 'text-win' : 'text-loss'}>
                        <span className="tabular">{streak.count}</span> {streak.type === 'W' ? 'wins' : 'losses'} in a row
                      </span>
                    ) : (
                      <span className="text-mute">Recent form</span>
                    )}
                    <WinLossDots form={form} />
                  </p>
                )}
              </Figure>
            )}
          </div>
        ))}
      />
    </AppShell>
  )
}

function GameLink({ game }: { game: TableGame }) {
  return (
    <Link href={`/leaderboard?game_type=${game}`} className="transition hover:text-white">
      {GAME_NAMES[game]}
    </Link>
  )
}
