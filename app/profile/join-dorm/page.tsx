import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import PageHeader from '@/components/ui/PageHeader'
import JoinDormList from '@/components/profile/JoinDormList'

export default async function JoinDormPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/profile/join-dorm')
  }

  const [{ data: dorms }, { data: userProfile }] = await Promise.all([
    supabase.from('dorms').select('*').order('name'),
    supabase.from('users').select('dorm_id').eq('id', user.id).single(),
  ])

  return (
    <AppShell width="4xl">
      <PageHeader title="Join a House" subtitle="Rep your colors on the leaderboard" />
      <JoinDormList dorms={dorms || []} userDormId={userProfile?.dorm_id || null} />
    </AppShell>
  )
}
