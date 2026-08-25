import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import PageHeader from '@/components/ui/PageHeader'
import InboxClient from '@/components/inbox/InboxClient'
import { getInboxItems } from '@/lib/inbox'

export default async function InboxPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/inbox')
  }

  const items = await getInboxItems(supabase, user.id)

  return (
    <AppShell width="4xl">
      <PageHeader title="Inbox" subtitle="Challenges, results and ledgers waiting on you" />
      <InboxClient items={items} currentUserId={user.id} />
    </AppShell>
  )
}
