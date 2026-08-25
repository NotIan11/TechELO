import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/layout/AppShell'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import LiveSessionBanner from '@/components/poker/LiveSessionBanner'
import SessionsListClient from '@/components/poker/SessionsListClient'
import type { SessionListItem } from '@/components/poker/SessionCard'
import { PAGE_SIZE } from '@/lib/poker/constants'
import { SESSION_LIST_SELECT, loadLiveSessionFor } from '@/lib/poker/queries'
import type { PokerKindFilter } from '@/lib/poker/types'

export default async function PokerSessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; mine?: string; page?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const kind: PokerKindFilter = params.kind === 'cash' || params.kind === 'tournament' ? params.kind : 'all'
  const mine = !!user && params.mine === '1'
  const page = Math.max(1, parseInt(params.page || '1') || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let mineIds: string[] | null = null
  if (mine) {
    const { data } = await supabase.from('poker_entries').select('session_id').eq('user_id', user!.id).limit(2000)
    mineIds = Array.from(new Set((data ?? []).map((r) => r.session_id as string)))
  }

  let listQuery = supabase
    .from('poker_sessions')
    .select(SESSION_LIST_SELECT, { count: 'exact' })
    .neq('status', 'live')
    .order('played_at', { ascending: false })
    .order('id', { ascending: false })
    .range(from, to)
  let liveQuery = supabase
    .from('poker_sessions')
    .select(SESSION_LIST_SELECT)
    .eq('status', 'live')
    .order('started_at', { ascending: false })
  if (kind !== 'all') {
    listQuery = listQuery.eq('kind', kind)
    liveQuery = liveQuery.eq('kind', kind)
  }
  if (mineIds) {
    listQuery = listQuery.in('id', mineIds.length > 0 ? mineIds : ['00000000-0000-0000-0000-000000000000'])
    liveQuery = liveQuery.in('id', mineIds.length > 0 ? mineIds : ['00000000-0000-0000-0000-000000000000'])
  }

  const [{ data: sessions, count }, { data: live }, myLive] = await Promise.all([
    listQuery,
    page === 1 ? liveQuery : Promise.resolve({ data: [] as unknown[] }),
    user ? loadLiveSessionFor(supabase, user.id) : Promise.resolve(null),
  ])

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))

  return (
    <AppShell width="4xl">
      <PageHeader
        title="Sessions"
        subtitle="Every logged night, newest first"
        actions={
          user ? (
            <Button href="/poker/sessions/new">{myLive ? 'Resume live session' : '+ Start a session'}</Button>
          ) : (
            <Button href="/login?redirect=/poker/sessions/new" variant="secondary">
              Sign in to log a session
            </Button>
          )
        }
      />
      <LiveSessionBanner session={myLive} />
      <SessionsListClient
        live={(live ?? []) as unknown as SessionListItem[]}
        sessions={(sessions ?? []) as unknown as SessionListItem[]}
        kind={kind}
        mine={mine}
        currentPage={page}
        totalPages={totalPages}
        viewerId={user?.id ?? null}
      />
    </AppShell>
  )
}
