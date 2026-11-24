import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ProfileEditForm from '@/components/profile/ProfileEditForm'
import AppShell from '@/components/layout/AppShell'
import PageIntro from '@/components/ui/PageIntro'

export default async function ProfileEditPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/profile/edit')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('*, dorms (id, name)')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/profile')
  }

  return (
    <AppShell width="4xl">
      <div className="max-w-[736px]">
        <PageIntro
          kicker={
            <Link href={`/profile/${profile.id}`} className="underline decoration-white/20 underline-offset-[3px] transition hover:text-white">
              {profile.display_name}
            </Link>
          }
          title="Settings"
        />
        <ProfileEditForm profile={profile} email={profile.university_email ?? user.email ?? ''} houseName={profile.dorms?.name ?? null} />
      </div>
    </AppShell>
  )
}
