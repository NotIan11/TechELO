import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/layout/AppShell'
import PageIntro, { Num } from '@/components/ui/PageIntro'
import LiveSessionBanner from '@/components/poker/LiveSessionBanner'
import { ParamCheckbox, ParamSelect } from '@/components/poker/ParamControls'
import PokerTabs from '@/components/poker/PokerTabs'
import SessionsListClient from '@/components/poker/SessionsListClient'
import type { SessionListItem } from '@/components/poker/SessionCard'
import { PAGE_SIZE } from '@/lib/poker/constants'
import { numberWord, plural } from '@/lib/poker/phrases'
import { SESSION_LIST_SELECT, loadLiveSessionFor, loadPokerTabCounts } from '@/lib/poker/queries'
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

  const [{ data: sessions, count }, { data: live }, myLive, tabCounts, satRes] = await Promise.all([
    listQuery,
    liveQuery,
    user ? loadLiveSessionFor(supabase, user.id) : Promise.resolve(null),
    loadPokerTabCounts(supabase, user?.id ?? null),
    user ? supabase.from('poker_counted_entries').select('id', { count: 'exact', head: true }).eq('user_id', user.id) : Promise.resolve({ count: null }),
  ])
  const liveRows = (live ?? []) as unknown as SessionListItem[]
  const nights = (count ?? 0) + liveRows.length
  const sat = satRes.count
  const what = kind === 'cash' ? 'cash game' : kind === 'tournament' ? 'tournament' : 'night'

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))

  return (
    <AppShell>
      <PageIntro
        title="Poker"
        lede={
          nights === 0 ? (
            <>{mine ? `You have not sat at a ${what} yet.` : `No ${what}s on the books yet.`}</>
          ) : (
            <>
              <Num>{nights}</Num> {plural(nights, what)} {mine ? 'with you at the table' : 'on the books'}
              {liveRows.length > 0 && <>, {liveRows.length === 1 ? (nights === 1 ? 'and it is' : 'one of them') : `${numberWord(liveRows.length)} of them`} still going</>}.
              {!mine && sat != null && (
                <>
                  {' '}
                  You sat at <Num>{sat}</Num>.
                </>
              )}
            </>
          )
        }
        actions={
          <>
            {user && <ParamCheckbox param="mine" checked={mine} label="Only nights I played" />}
            <ParamSelect
              param="kind"
              value={kind}
              defaultValue="all"
              aria-label="Kind"
              options={[
                { value: 'all', label: 'Cash and tournaments' },
                { value: 'cash', label: 'Cash games' },
                { value: 'tournament', label: 'Tournaments' },
              ]}
            />
          </>
        }
      />
      <PokerTabs active="sessions" sessions={tabCounts.sessions} guests={tabCounts.guests} signedIn={!!user} />
      <LiveSessionBanner session={myLive} className="mt-6" />
      <SessionsListClient
        live={page === 1 ? liveRows : []}
        sessions={(sessions ?? []) as unknown as SessionListItem[]}
        mine={mine}
        currentPage={page}
        totalPages={totalPages}
        viewerId={user?.id ?? null}
      />
    </AppShell>
  )
}
