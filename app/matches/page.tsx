import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import GameIcon from '@/components/ui/GameIcon'
import Icon from '@/components/ui/Icon'
import Button from '@/components/ui/Button'
import SectionHeader from '@/components/ui/SectionHeader'
import TextLink from '@/components/ui/TextLink'
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
        eyebrow="Table games"
        title="Matches"
        subtitle="Your challenges and results"
        actions={
          <Button href="/matches/new">
            <Icon name="plus" className="h-4 w-4" strokeWidth={2} /> New match
          </Button>
        }
      />

      {all.length === 0 ? (
        <EmptyState
          icon={<GameIcon game="pool" />}
          title="No matches yet"
          description="Challenge someone. Your rating moves once you both confirm the result."
          action={<Button href="/matches/new">Challenge someone</Button>}
        />
      ) : (
        <div className="space-y-8">
          {active.length > 0 && (
            <section>
              <SectionHeader title="Active" />
              <div className="space-y-3">
                {active.map((match) => (
                  <MatchCard key={match.id} match={match} viewerId={user.id} />
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <SectionHeader title="History" />
              <div className="space-y-3">
                {past.map((match) => (
                  <MatchCard key={match.id} match={match} viewerId={user.id} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <p className="mt-6 text-[13px] text-zinc-400">
        Between matches? The poker ledger is open.{' '}
        <TextLink href="/poker/sessions/new" arrow="right" className="text-[13px]">
          Start a game
        </TextLink>
      </p>
    </AppShell>
  )
}
