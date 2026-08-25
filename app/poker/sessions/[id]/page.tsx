import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import EventPage from '@/components/poker/EventPage'
import LiveLedgerEditor from '@/components/poker/LiveLedgerEditor'
import LiveSessionView from '@/components/poker/LiveSessionView'
import SessionDetails from '@/components/poker/SessionDetails'
import { loadIsOfficer, loadPickerPlayers, loadRecentTablemates, loadSessionFull, loadSponsors } from '@/lib/poker/queries'

export default async function PokerSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const [{ data: { user } }, session] = await Promise.all([supabase.auth.getUser(), loadSessionFull(supabase, id)])

  if (!session) notFound()

  const isHost = !!user && session.host_id === user.id

  if (session.status === 'live' && isHost) {
    const [players, recent] = await Promise.all([
      loadPickerPlayers(supabase),
      loadRecentTablemates(supabase, user!.id),
    ])
    return (
      <AppShell width="4xl">
        <LiveLedgerEditor session={session} currentUserId={user!.id} players={players} recent={recent} mode="live" />
      </AppShell>
    )
  }

  if (session.status === 'live') {
    return (
      <AppShell width="4xl">
        <LiveSessionView session={session} currentUserId={user?.id ?? null} />
      </AppShell>
    )
  }

  if (session.status === 'scheduled') {
    const [isOfficer, sponsors] = await Promise.all([
      user ? loadIsOfficer(supabase, user.id) : Promise.resolve(false),
      isHost ? loadSponsors(supabase) : Promise.resolve([]),
    ])
    return (
      <AppShell width="4xl">
        <EventPage
          session={session}
          currentUserId={user?.id ?? null}
          isHost={isHost}
          isOfficer={isOfficer}
          sponsors={sponsors}
        />
      </AppShell>
    )
  }

  return (
    <AppShell width="4xl">
      <SessionDetails session={session} currentUserId={user?.id ?? null} />
    </AppShell>
  )
}
