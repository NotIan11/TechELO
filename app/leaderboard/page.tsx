import { createClient } from '@/lib/supabase/server'
import LeaderboardClient from '@/components/leaderboard/LeaderboardClient'
import AppShell from '@/components/layout/AppShell'
import Button from '@/components/ui/Button'
import PageHeader from '@/components/ui/PageHeader'
import { gameLabel } from '@/components/ui/GameIcon'

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ game_type?: string; page?: string; dorm_id?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const gameType = params.game_type === 'ping_pong' ? ('ping_pong' as const) : ('pool' as const)
  const page = Math.max(1, parseInt(params.page || '1') || 1)
  const dormId = params.dorm_id || null
  const limit = 50
  const offset = (page - 1) * limit

  const [{ data: leaderboard }, { data: dorms }, { data: { user } }, { data: rpcCount }] = await Promise.all([
    supabase.rpc('get_leaderboard', { p_game_type: gameType, p_limit: limit, p_offset: offset, p_dorm_id: dormId }),
    supabase.from('dorms').select('id, name').order('name'),
    supabase.auth.getUser(),
    supabase.rpc('get_leaderboard_count', { p_game_type: gameType, p_dorm_id: dormId }),
  ])
  const count = Number(rpcCount ?? 0) || 0

  // get_leaderboard doesn't return avatars
  const userIds = (leaderboard || []).map((e: any) => e.user_id)
  let avatarMap: Record<string, string | null> = {}
  if (userIds.length > 0) {
    const { data: avatarRows } = await supabase.from('users').select('id, profile_image_url').in('id', userIds)
    avatarMap = Object.fromEntries((avatarRows || []).map((u) => [u.id, u.profile_image_url]))
  }
  const entries = (leaderboard || []).map((e: any) => ({ ...e, profile_image_url: avatarMap[e.user_id] ?? null }))
  const totalPages = Math.max(1, Math.ceil(count / limit))

  return (
    <AppShell>
      <PageHeader
        eyebrow="Table games"
        title="Rankings"
        subtitle={`${count} ranked at ${gameLabel(gameType).toLowerCase()} · ELO, confirmed by both players`}
        actions={
          user ? (
            <Button href="/matches/new">Challenge someone</Button>
          ) : (
            <Button href="/login?redirect=/matches/new" variant="secondary">
              Sign in to play
            </Button>
          )
        }
      />
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
