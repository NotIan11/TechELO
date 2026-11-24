import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import CreateMatchForm from '@/components/match/CreateMatchForm'
import StartSessionForm from '@/components/poker/StartSessionForm'
import Button from '@/components/ui/Button'
import PageIntro from '@/components/ui/PageIntro'
import { loadHouseNames, loadIsOfficer, loadLiveSessionFor, loadSponsors } from '@/lib/poker/queries'
import { sessionTitle } from '@/lib/poker/stats'
import { rankByRating, type RatedPlayer } from '@/lib/stats'

export default async function PlayPage({
  searchParams,
}: {
  searchParams: Promise<{ opponent?: string; game_type?: string; kind?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const qs = new URLSearchParams()
    if (params.opponent) qs.set('opponent', params.opponent)
    if (params.game_type) qs.set('game_type', params.game_type)
    if (params.kind) qs.set('kind', params.kind)
    const query = qs.toString()
    redirect(`/login?redirect=${encodeURIComponent(`/play${query ? `?${query}` : ''}`)}`)
  }

  const [{ data: users }, { data: ratings }, live, isOfficer, sponsors, houseNames] = await Promise.all([
    supabase
      .from('users')
      .select('id, display_name, profile_image_url, dorms(name)')
      .neq('id', user.id)
      .order('display_name'),
    supabase.from('elo_ratings').select('user_id, game_type, rating, matches_played, wins'),
    loadLiveSessionFor(supabase, user.id),
    loadIsOfficer(supabase, user.id),
    loadSponsors(supabase),
    loadHouseNames(supabase),
  ])

  // user_id -> { pool: rating, ping_pong: rating }, and the same shape for ranks
  const ratingMap: Record<string, Record<string, number>> = {}
  const byGame: Record<string, RatedPlayer[]> = {}
  for (const r of ratings ?? []) {
    ;(ratingMap[r.user_id] ??= {})[r.game_type] = r.rating
    ;(byGame[r.game_type] ??= []).push(r)
  }
  const rankMap: Record<string, Record<string, number>> = {}
  for (const [game, players] of Object.entries(byGame)) {
    for (const [userId, rank] of Object.entries(rankByRating(players))) {
      ;(rankMap[userId] ??= {})[game] = rank
    }
  }

  const opponents = (users ?? []).map((u: any) => ({
    id: u.id,
    display_name: u.display_name,
    profile_image_url: u.profile_image_url,
    dorm_name: u.dorms?.name ?? null,
    ratings: ratingMap[u.id] ?? {},
    ranks: rankMap[u.id] ?? {},
  }))

  const initialGameType = params.game_type === 'ping_pong' ? ('ping_pong' as const) : ('pool' as const)

  return (
    <AppShell>
      <PageIntro title="Play" lede="Challenge someone at the table, or open a poker ledger for tonight." />

      <div className="mt-10 grid border-t border-line-bright lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <section className="min-w-0 pb-12 pt-7 lg:pb-0 lg:pr-12">
          <h2 className="font-display text-2xl font-normal text-white">Challenge someone</h2>
          <div className="mt-5">
            <CreateMatchForm
              opponents={opponents}
              myRatings={ratingMap[user.id] ?? {}}
              initialOpponentId={params.opponent ?? null}
              initialGameType={initialGameType}
            />
          </div>
        </section>

        <section id="poker" className="min-w-0 border-t border-line-strong pt-7 lg:border-l lg:border-t-0 lg:pl-12">
          <h2 className="font-display text-2xl font-normal text-white">Open a poker table</h2>
          <div className="mt-5">
            {live ? (
              // One live table per host: the form gives way to the table that is already open
              <>
                <p className="text-[15px] text-zinc-400">
                  You already have a table open: <span className="text-white">{sessionTitle(live)}</span>. Close it out before you open another.
                </p>
                <div className="mt-5">
                  <Button href={`/poker/sessions/${live.id}`} variant="outline" size="lg">
                    Back to your table
                  </Button>
                </div>
              </>
            ) : (
              <StartSessionForm
                isOfficer={isOfficer}
                sponsors={sponsors}
                houseNames={houseNames}
                initialKind={params.kind === 'tournament' ? 'tournament' : 'cash'}
              />
            )}
          </div>
        </section>
      </div>
    </AppShell>
  )
}
