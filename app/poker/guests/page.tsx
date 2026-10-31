import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import Button from '@/components/ui/Button'
import PageHeader from '@/components/ui/PageHeader'
import GuestsClient from '@/components/poker/GuestsClient'
import { loadGuestSummaries, loadIsOfficer, loadPickerPlayers } from '@/lib/poker/queries'

/** Guests a host seated before they had an account; link them once they sign up. */
export default async function PokerGuestsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login?redirect=/poker/guests')
  }
  const isOfficer = await loadIsOfficer(supabase, user.id)
  const [guests, players] = await Promise.all([loadGuestSummaries(supabase, user.id, isOfficer), loadPickerPlayers(supabase)])

  return (
    <AppShell promo="tables" width="4xl">
      <PageHeader
        title="Guests"
        subtitle={
          isOfficer
            ? 'Everyone seated before they had an account. Link a guest once they sign up and every session moves to their record.'
            : 'People you seated before they had an account. Link them once they sign up and every session they played moves to their record.'
        }
        actions={
          <Button href="/poker/sessions/new" variant="secondary">
            Start a game
          </Button>
        }
      />
      <GuestsClient guests={guests} players={players} currentUserId={user.id} isOfficer={isOfficer} />
    </AppShell>
  )
}
