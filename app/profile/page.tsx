import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * /profile just ensures the signed-in user has a profile row, then sends them
 * to their public profile page (single source of truth for the profile UI).
 */
export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/profile')
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single()

  // If authenticated but no row in users (e.g. trigger/callback didn't run), create it now
  if (!profile && profileError?.code === 'PGRST116') {
    const email = (user.email ?? '').toLowerCase()
    const firstName = user.user_metadata?.first_name ?? ''
    const lastName = user.user_metadata?.last_name ?? ''
    const displayName =
      firstName && lastName ? `${firstName} ${lastName}`.trim() : email.split('@')[0] || 'User'
    await supabase.rpc('create_user_profile', {
      p_user_id: user.id,
      p_university_email: email,
      p_display_name: displayName,
      p_first_name: firstName || null,
      p_last_name: lastName || null,
    })
    // If the RPC failed (e.g. function missing), the profile page will 404;
    // the auth callback also tries to create the row, so this is best-effort.
  }

  redirect(`/profile/${user.id}`)
}
