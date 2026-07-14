import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import PageHeader from '@/components/ui/PageHeader'
import InboxClient from '@/components/inbox/InboxClient'
import { isChallengeExpired } from '@/lib/utils'

export default async function InboxPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/inbox')
  }

  const { data: matches } = await supabase
    .from('matches')
    .select(`
      *,
      player1:users!player1_id(id, display_name, profile_image_url),
      player2:users!player2_id(id, display_name, profile_image_url)
    `)
    .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
    .in('status', ['pending_start', 'in_progress', 'pending_result'])
    .order('created_at', { ascending: false })

  type PendingItem = {
    match: NonNullable<typeof matches>[number]
    action: 'accept_start' | 'report_result'
  }
  const pendingItems: PendingItem[] = []

  for (const match of matches ?? []) {
    const isPlayer1 = match.player1_id === user.id
    const isPlayer2 = match.player2_id === user.id

    if (
      match.status === 'pending_start' &&
      isPlayer2 &&
      !match.player2_start_accepted &&
      !isChallengeExpired(match.created_at)
    ) {
      pendingItems.push({ match, action: 'accept_start' })
    } else if (
      (match.status === 'in_progress' || match.status === 'pending_result') &&
      ((isPlayer1 && !match.player1_result_accepted) || (isPlayer2 && !match.player2_result_accepted))
    ) {
      pendingItems.push({ match, action: 'report_result' })
    }
  }

  return (
    <AppShell width="4xl">
      <PageHeader title="Inbox" subtitle="Challenges and results waiting on you" />
      <InboxClient pendingItems={pendingItems} currentUserId={user.id} />
    </AppShell>
  )
}
