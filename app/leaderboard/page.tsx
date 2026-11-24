import { createClient } from '@/lib/supabase/server'
import LeaderboardClient from '@/components/leaderboard/LeaderboardClient'
import AppShell from '@/components/layout/AppShell'
import { Num } from '@/components/ui/PageIntro'
import { ordinal } from '@/lib/poker/money'
import { getGameStanding } from '@/lib/promo'
import { daysAgo, ratingChangesSince, recentForm, type CompletedMatchLike } from '@/lib/stats'

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ game_type?: string; page?: string; dorm_id?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const gameType = params.game_type === 'ping_pong' ? ('ping_pong' as const) : ('pool' as const)
  const gameName = gameType === 'ping_pong' ? 'Ping pong' : 'Pool'
  const page = Math.max(1, parseInt(params.page || '1') || 1)
  const dormId = params.dorm_id || null
  const limit = 50
  const offset = (page - 1) * limit
  const since = daysAgo(30)

  const [{ data: leaderboard }, { data: dorms }, { data: { user } }, { data: rpcCount }, { data: recentRows }] = await Promise.all([
    supabase.rpc('get_leaderboard', { p_game_type: gameType, p_limit: limit, p_offset: offset, p_dorm_id: dormId }),
    supabase.from('dorms').select('id, name').order('name'),
    supabase.auth.getUser(),
    supabase.rpc('get_leaderboard_count', { p_game_type: gameType, p_dorm_id: dormId }),
    // One window of recent results feeds both the 30-day column and the last-five column
    supabase
      .from('matches')
      .select('player1_id, player2_id, winner_id, player1_elo_before, player2_elo_before, player1_elo_after, player2_elo_after, game_type, completed_at, created_at')
      .eq('game_type', gameType)
      .eq('status', 'completed')
      .gte('completed_at', since.toISOString())
      .order('completed_at', { ascending: false })
      .limit(2000),
  ])
  const count = Number(rpcCount ?? 0) || 0
  const totalPages = Math.max(1, Math.ceil(count / limit))

  const recent = (recentRows ?? []) as CompletedMatchLike[]
  const changes = ratingChangesSince(recent, since, gameType)
  const entries = (leaderboard || []).map((e: any) => ({
    ...e,
    rank: Number(e.rank),
    change30: (changes[e.user_id] ?? null) as number | null,
    form: recentForm(recent, e.user_id, gameType, 5),
  }))

  const standing = user ? await getGameStanding(supabase, user.id, gameType) : null

  let lede: React.ReactNode
  if (standing?.ranked && standing.rank != null) {
    const { above, below } = standing
    lede = (
      <>
        You are {ordinal(standing.rank)} of <Num>{standing.total}</Num>.
        {above && (
          <>
            {' '}
            {above.name} is <Num>{above.gap}</Num> ahead{below ? ',' : '.'}
          </>
        )}
        {below && (
          <>
            {' '}
            {below.name} {above ? '' : 'is '}
            <Num>{below.gap}</Num> behind.
          </>
        )}
      </>
    )
  } else {
    const total = standing?.total ?? (dormId ? null : count)
    lede = (
      <>
        {total != null && (
          <>
            <Num>{total}</Num> ranked.{' '}
          </>
        )}
        {user ? 'One confirmed match puts you on the board.' : 'Ratings move when both players confirm a result.'}
      </>
    )
  }

  return (
    <AppShell>
      <LeaderboardClient
        title={gameName}
        lede={lede}
        tabs={[
          { href: `/leaderboard?game_type=${gameType}`, label: 'Rankings', active: true },
          ...(user ? [{ href: `/matches?game_type=${gameType}`, label: 'Your matches', count: standing?.played ?? null }] : []),
        ]}
        leaderboard={entries}
        gameType={gameType}
        currentPage={page}
        pageSize={limit}
        total={count}
        totalPages={totalPages}
        dorms={dorms || []}
        selectedDormId={dormId}
        currentUserId={user?.id ?? null}
      />
    </AppShell>
  )
}
