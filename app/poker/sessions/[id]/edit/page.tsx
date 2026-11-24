import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import LiveLedgerEditor from '@/components/poker/LiveLedgerEditor'
import { loadPickerGuests, loadPickerPlayers, loadRecentTablemates, loadSessionFull } from '@/lib/poker/queries'

export default async function EditPokerSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/login?redirect=/poker/sessions/${id}/edit`)
  }

  const session = await loadSessionFull(supabase, id)
  if (!session) notFound()
  if (session.host_id !== user.id || (session.status !== 'final' && session.status !== 'disputed')) {
    redirect(`/poker/sessions/${id}`)
  }

  const [players, guests, recent] = await Promise.all([
    loadPickerPlayers(supabase),
    loadPickerGuests(supabase),
    loadRecentTablemates(supabase, user.id),
  ])

  return (
    <AppShell width="4xl">
      <LiveLedgerEditor session={session} currentUserId={user.id} players={players} guests={guests} recent={recent} mode="edit" />
    </AppShell>
  )
}
