import { redirect } from 'next/navigation'

/** Challenges are sent from /play now; old links keep their preselection. */
export default async function NewMatchPage({
  searchParams,
}: {
  searchParams: Promise<{ opponent?: string; game_type?: string }>
}) {
  const params = await searchParams
  const qs = new URLSearchParams()
  if (params.opponent) qs.set('opponent', params.opponent)
  if (params.game_type) qs.set('game_type', params.game_type)
  const query = qs.toString()
  redirect(`/play${query ? `?${query}` : ''}`)
}
