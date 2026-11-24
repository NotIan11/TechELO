import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import PageIntro from '@/components/ui/PageIntro'
import GuestsClient from '@/components/poker/GuestsClient'
import PokerTabs from '@/components/poker/PokerTabs'
import { numberWord } from '@/lib/poker/phrases'
import { loadGuestSummaries, loadIsOfficer, loadPickerPlayers, loadPokerTabCounts } from '@/lib/poker/queries'

/** Guests a host seated before they had an account; link them once they sign up. */
export default async function PokerGuestsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login?redirect=/poker/guests')
  }
  const isOfficer = await loadIsOfficer(supabase, user.id)
  const [guests, players, tabCounts] = await Promise.all([
    loadGuestSummaries(supabase, user.id, isOfficer),
    loadPickerPlayers(supabase),
    loadPokerTabCounts(supabase, user.id),
  ])
  const waiting = guests.filter((g) => !g.linked_user_id).length
  const seated = isOfficer ? 'seated at a table' : 'you seated'

  return (
    <AppShell>
      <PageIntro
        title="Poker"
        lede={
          waiting === 0
            ? guests.length === 0
              ? `Nobody ${isOfficer ? 'has been seated as a guest' : 'you seated is a guest'} yet. Guests are people at the table who have no account.`
              : `Everyone ${seated} as a guest now has an account.`
            : `${numberWord(waiting, true)} ${waiting === 1 ? 'person' : 'people'} ${seated} still ${waiting === 1 ? 'has' : 'have'} no account. Link them when they sign up and every night they played moves to their record.`
        }
      />
      <PokerTabs active="guests" sessions={tabCounts.sessions} guests={tabCounts.guests} signedIn />
      <GuestsClient guests={guests} players={players} currentUserId={user.id} isOfficer={isOfficer} />
    </AppShell>
  )
}
