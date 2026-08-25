import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CreateMatchForm from '@/components/match/CreateMatchForm'
import AppShell from '@/components/layout/AppShell'
import PageHeader from '@/components/ui/PageHeader'

export default async function NewMatchPage({
  searchParams,
}: {
  searchParams: Promise<{ opponent?: string; game_type?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/matches/new')
  }

  const [{ data: users }, { data: ratings }] = await Promise.all([
    supabase
      .from('users')
      .select('id, display_name, profile_image_url, dorms(name)')
      .neq('id', user.id)
      .order('display_name'),
    supabase.from('elo_ratings').select('user_id, game_type, rating'),
  ])

  // user_id -> { pool: rating, ping_pong: rating }
  const ratingMap: Record<string, Record<string, number>> = {}
  for (const r of ratings ?? []) {
    ;(ratingMap[r.user_id] ??= {})[r.game_type] = r.rating
  }

  const opponents = (users ?? []).map((u: any) => ({
    id: u.id,
    display_name: u.display_name,
    profile_image_url: u.profile_image_url,
    dorm_name: u.dorms?.name ?? null,
    ratings: ratingMap[u.id] ?? {},
  }))

  const initialGameType = params.game_type === 'ping_pong' ? 'ping_pong' as const : 'pool' as const

  return (
    <AppShell width="2xl">
      <PageHeader
        title="New match"
        subtitle="Pick a game and an opponent. They get a challenge to accept."
      />
      <CreateMatchForm
        opponents={opponents}
        myRatings={ratingMap[user.id] ?? {}}
        initialOpponentId={params.opponent ?? null}
        initialGameType={initialGameType}
      />
    </AppShell>
  )
}
