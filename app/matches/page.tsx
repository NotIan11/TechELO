import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import GameIcon from '@/components/ui/GameIcon'
import Button from '@/components/ui/Button'
import MatchCard, { type MatchWithPlayers } from '@/components/match/MatchCard'

const ACTIVE_STATUSES = ['pending_start', 'in_progress', 'pending_result']

export default async function MatchesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/matches')
  }

  const { data: matches } = await supabase
    .from('matches')
    .select(`
      *,
      player1:users!player1_id(id, display_name, profile_image_url),
      player2:users!player2_id(id, display_name, profile_image_url)
    `)
    .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .limit(50)

  const all = (matches ?? []) as MatchWithPlayers[]
  const active = all.filter((m) => ACTIVE_STATUSES.includes(m.status))
  const past = all.filter((m) => !ACTIVE_STATUSES.includes(m.status))

  return (
    <AppShell width="4xl">
      <PageHeader
        title="Matches"
        subtitle="Your challenges and results"
        actions={<Button href="/matches/new">+ New Match</Button>}
      />

      {all.length === 0 ? (
        <EmptyState
          icon={<GameIcon game="pool" />}
          title="No matches yet"
          description="Challenge a housemate to your first game — once you both confirm the result, your rating starts moving."
          action={<Button href="/matches/new">Start your first match</Button>}
        />
      ) : (
        <div className="space-y-8">
          {active.length > 0 && (
            <section>
              <h2 className="mb-3 eyebrow">
                Active
              </h2>
              <div className="space-y-3">
                {active.map((match) => (
                  <MatchCard key={match.id} match={match} viewerId={user.id} />
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="mb-3 eyebrow">
                History
              </h2>
              <div className="space-y-3">
                {past.map((match) => (
                  <MatchCard key={match.id} match={match} viewerId={user.id} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </AppShell>
  )
}
