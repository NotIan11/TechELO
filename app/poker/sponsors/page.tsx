import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import SponsorLibrary from '@/components/poker/SponsorLibrary'
import { loadIsOfficer, loadSponsors } from '@/lib/poker/queries'

export default async function PokerSponsorsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login?redirect=/poker/sponsors')
  }
  const isOfficer = await loadIsOfficer(supabase, user.id)
  if (!isOfficer) {
    redirect('/poker')
  }
  const sponsors = await loadSponsors(supabase)

  return (
    <AppShell width="4xl">
      <PageHeader
        title="Sponsors"
        subtitle="Logos reused across every official tournament"
        actions={<Button href="/poker/sessions/new?kind=tournament" variant="secondary">Schedule a tournament</Button>}
      />
      <SponsorLibrary sponsors={sponsors} />
    </AppShell>
  )
}
