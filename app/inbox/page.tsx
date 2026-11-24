import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/** The inbox is the home screen now; old links and emails still land here. */
export default async function InboxPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  redirect(user ? '/' : '/login?redirect=/')
}
