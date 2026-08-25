import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import PageHeader from '@/components/ui/PageHeader'
import StartSessionForm from '@/components/poker/StartSessionForm'
import { loadHouseNames, loadIsOfficer, loadLiveSessionFor, loadSponsors } from '@/lib/poker/queries'

export default async function NewPokerSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login?redirect=/poker/sessions/new')
  }

  const live = await loadLiveSessionFor(supabase, user.id)
  if (live) {
    redirect(`/poker/sessions/${live.id}`)
  }

  const [isOfficer, sponsors, houseNames] = await Promise.all([
    loadIsOfficer(supabase, user.id),
    loadSponsors(supabase),
    loadHouseNames(supabase),
  ])

  return (
    <AppShell width="2xl">
      <PageHeader
        title="Start a session"
        subtitle="Set the table up, then add players and buy-ins as the night goes."
      />
      <StartSessionForm
        isOfficer={isOfficer}
        sponsors={sponsors}
        houseNames={houseNames}
        initialKind={params.kind === 'tournament' ? 'tournament' : 'cash'}
      />
    </AppShell>
  )
}
