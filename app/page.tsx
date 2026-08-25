import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LeaderboardClient from '@/components/leaderboard/LeaderboardClient'
import AppShell from '@/components/layout/AppShell'
import Button from '@/components/ui/Button'
import GameIcon from '@/components/ui/GameIcon'
import { isMissingRpc } from '@/lib/utils'
import { formatCents } from '@/lib/poker/money'
import { periodBounds, termFor } from '@/lib/poker/periods'

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ game_type?: string; page?: string; dorm_id?: string; error_code?: string }>
}) {
  const params = await searchParams
  const { game_type, page: pageParam, dorm_id, error_code } = params

  if (error_code === 'otp_expired') {
    redirect('/login?error=link_expired')
  }

  const supabase = await createClient()
  const gameType = (game_type as 'pool' | 'ping_pong') || 'pool'
  const page = Math.max(1, parseInt(pageParam || '1') || 1)
  const dormId = dorm_id || null
  const limit = 50
  const offset = (page - 1) * limit

  const [{ data: leaderboard }, { data: dorms }, { data: { user } }] = await Promise.all([
    supabase.rpc('get_leaderboard', {
      p_game_type: gameType,
      p_limit: limit,
      p_offset: offset,
      p_dorm_id: dormId,
    }),
    supabase.from('dorms').select('id, name').order('name'),
    supabase.auth.getUser(),
  ])

  // Ranked-player count for pagination; respects the dorm filter (migration 012).
  // Fallback for older databases: unfiltered count of rating rows.
  let count = 0
  const { data: rpcCount, error: countError } = await supabase.rpc('get_leaderboard_count', {
    p_game_type: gameType,
    p_dorm_id: dormId,
  })
  if (!countError && rpcCount != null && Number.isFinite(Number(rpcCount))) {
    count = Number(rpcCount)
  } else if (isMissingRpc(countError)) {
    const { count: legacyCount } = await supabase
      .from('elo_ratings')
      .select('*', { count: 'exact', head: true })
      .eq('game_type', gameType)
    count = legacyCount || 0
  }

  // Avatars for the listed players (get_leaderboard doesn't return them)
  const userIds = (leaderboard || []).map((e: any) => e.user_id)
  let avatarMap: Record<string, string | null> = {}
  if (userIds.length > 0) {
    const { data: avatarRows } = await supabase
      .from('users')
      .select('id, profile_image_url')
      .in('id', userIds)
    avatarMap = Object.fromEntries((avatarRows || []).map((u) => [u.id, u.profile_image_url]))
  }

  const entries = (leaderboard || []).map((e: any) => ({
    ...e,
    profile_image_url: avatarMap[e.user_id] ?? null,
  }))

  const totalPages = Math.max(1, Math.ceil(count / limit))

  // Poker teaser: money that changed hands this term (tolerates a DB without migration 013)
  const { since: termSince } = periodBounds('term')
  const { data: pokerSessions, error: pokerError } = await supabase
    .from('poker_sessions')
    .select('total_buy_in_cents')
    .in('status', ['final', 'disputed'])
    .gte('played_at', termSince ?? '1970-01-01')
  const pokerAvailable = !pokerError
  const pokerStaked = (pokerSessions ?? []).reduce((s, r) => s + Number(r.total_buy_in_cents), 0)
  const pokerSessionCount = pokerSessions?.length ?? 0

  return (
    <AppShell>
      {/* Hero */}
      <section className="pb-10 pt-4 text-center sm:pt-8">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-500/40 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-400">
          <span aria-hidden="true">🏆</span> House standings
        </p>
        <h1 className="font-display text-4xl font-bold tracking-tight text-white sm:text-6xl">
          Who runs the{' '}
          <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
            table?
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-balance text-zinc-400">
          Challenge your housemates at pool and ping pong, confirm results together, and watch the
          rankings settle it once and for all.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button href={user ? '/matches/new' : '/signup'} size="lg">
            {user ? 'Challenge someone' : 'Join Tech ELO'}
          </Button>
          {user ? (
            <Button href="/poker" variant="secondary" size="lg">
              Poker ledger
            </Button>
          ) : (
            <Button href="/login" variant="secondary" size="lg">
              Sign in
            </Button>
          )}
        </div>
      </section>

      {pokerAvailable && (
        <Link
          href="/poker"
          className="group mb-8 flex items-center justify-between gap-4 rounded-2xl border border-violet-400/20 bg-gradient-to-r from-violet-500/10 to-transparent p-4 transition hover:border-violet-400/40 sm:p-5"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-poker">
              <GameIcon game="poker" className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block font-display font-semibold text-white group-hover:text-violet-200">Poker</span>
              <span className="block truncate text-sm text-zinc-400">
                {pokerSessionCount > 0
                  ? `${formatCents(pokerStaked, { compact: true })} changed hands across ${pokerSessionCount} session${pokerSessionCount === 1 ? '' : 's'} in ${termFor().label}`
                  : 'Cash games, tournaments, and who’s really up this term'}
              </span>
            </span>
          </span>
          <span className="shrink-0 text-sm font-semibold text-violet-200">Who’s up? →</span>
        </Link>
      )}

      <LeaderboardClient
        leaderboard={entries}
        gameType={gameType}
        currentPage={page}
        totalPages={totalPages}
        dorms={dorms || []}
        selectedDormId={dormId}
        currentUserId={user?.id ?? null}
      />
    </AppShell>
  )
}
