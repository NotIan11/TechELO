import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { loadLiveSessionFor } from '@/lib/poker/queries'

/**
 * The start form now lives on /play. This route keeps its guards (sign in first;
 * a host with a live table goes back to it) and otherwise forwards there with
 * whatever query string it was given.
 */
export default async function NewPokerSessionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login?redirect=/poker/sessions/new')
  }

  const live = await loadLiveSessionFor(supabase, user.id)
  if (live) {
    redirect(`/poker/sessions/${live.id}`)
  }

  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    const v = Array.isArray(value) ? value[0] : value
    if (v != null && v !== '') qs.set(key, v)
  }
  const query = qs.toString()
  redirect(`/play${query ? `?${query}` : ''}`)
}
