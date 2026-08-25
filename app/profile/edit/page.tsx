import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileEditForm from '@/components/profile/ProfileEditForm'
import AppShell from '@/components/layout/AppShell'
import PageHeader from '@/components/ui/PageHeader'

export default async function ProfileEditPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/profile/edit')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/profile')
  }

  return (
    <AppShell width="2xl">
      <PageHeader title="Edit profile" subtitle="Your name and picture, as the boards show them" />
      <ProfileEditForm profile={profile} />
    </AppShell>
  )
}
