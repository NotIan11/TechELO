import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/layout/AppShell'
import PageIntro, { Num } from '@/components/ui/PageIntro'
import TextLink from '@/components/ui/TextLink'
import FeaturedEventCard, { type FeaturedEvent } from '@/components/poker/FeaturedEventCard'
import HallOfFame from '@/components/poker/HallOfFame'
import LiveNowPanel from '@/components/poker/LiveNowPanel'
import LiveSessionBanner from '@/components/poker/LiveSessionBanner'
import { ParamSelect } from '@/components/poker/ParamControls'
import PokerLeaderboardClient from '@/components/poker/PokerLeaderboardClient'
import PokerTabs from '@/components/poker/PokerTabs'
import SessionCard, { type SessionListItem } from '@/components/poker/SessionCard'
import { PAGE_SIZE, PERIOD_OPTIONS, SHARK_MIN_SESSIONS } from '@/lib/poker/constants'
import { formatCents } from '@/lib/poker/money'
import { isPokerPeriod, periodBounds, periodLabel } from '@/lib/poker/periods'
import { plural } from '@/lib/poker/phrases'
import { SESSION_LIST_SELECT, loadIsOfficer, loadLiveSessionFor, loadPokerTabCounts } from '@/lib/poker/queries'
import { groupAwards, playerSummary } from '@/lib/poker/stats'
import type { PlayerRef, PokerCountedEntry, PokerKindFilter, PokerLeaderboardRow, PokerPeriod, PokerSessionRow, PokerSort, PokerSponsorRow } from '@/lib/poker/types'

/** How the period reads at the end of a sentence */
const PERIOD_PHRASE: Record<PokerPeriod, string> = {
  term: 'this term',
  '30d': 'in the last 30 days',
  year: 'this year',
  all: 'since the ledger opened',
}

const SORTS: PokerSort[] = ['net', 'roi', 'staked', 'sessions']

export default async function PokerHubPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; period?: string; dorm_id?: string; sort?: string; page?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const kind: PokerKindFilter = params.kind === 'cash' || params.kind === 'tournament' ? params.kind : 'all'
  const period = isPokerPeriod(params.period) ? params.period : 'term'
  const sort: PokerSort = SORTS.includes(params.sort as PokerSort) ? (params.sort as PokerSort) : 'net'
  const dormId = params.dorm_id || null
  const page = Math.max(1, parseInt(params.page || '1') || 1)
  const { since, until } = periodBounds(period)
  const minSessions = sort === 'roi' ? SHARK_MIN_SESSIONS : 1
  const rpcKind = kind === 'all' ? null : kind

  const [{ data: { user } }, leaderboardRes, countRes, { data: dorms }, entriesRes, sessionsRes, recentRes, featuredRes, liveRes] =
    await Promise.all([
      supabase.auth.getUser(),
      supabase.rpc('get_poker_leaderboard', {
        p_kind: rpcKind,
        p_dorm_id: dormId,
        p_since: since,
        p_until: until,
        p_sort: sort,
        p_min_sessions: minSessions,
        p_limit: PAGE_SIZE,
        p_offset: (page - 1) * PAGE_SIZE,
      }),
      supabase.rpc('get_poker_leaderboard_count', {
        p_kind: rpcKind,
        p_dorm_id: dormId,
        p_since: since,
        p_until: until,
        p_min_sessions: minSessions,
      }),
      supabase.from('dorms').select('id, name').order('name'),
      // Every counted entry in the period (awards, form dots, club totals)
      (() => {
        let q = supabase.from('poker_counted_entries').select('*')
        if (rpcKind) q = q.eq('kind', rpcKind)
        if (since) q = q.gte('played_at', since)
        if (until) q = q.lt('played_at', until)
        return q.limit(5000)
      })(),
      (() => {
        let q = supabase
          .from('poker_sessions')
          .select('id, kind, title, stakes, variant, is_official, played_at, total_buy_in_cents, player_count')
          .in('status', ['final', 'disputed'])
        if (rpcKind) q = q.eq('kind', rpcKind)
        if (since) q = q.gte('played_at', since)
        if (until) q = q.lt('played_at', until)
        return q.limit(2000)
      })(),
      supabase
        .from('poker_sessions')
        .select(SESSION_LIST_SELECT)
        .neq('status', 'voided')
        .neq('status', 'scheduled')
        .order('played_at', { ascending: false })
        .limit(5),
      supabase
        .from('poker_sessions')
        .select('*, session_sponsors:poker_session_sponsors(position, sponsor:poker_sponsors(*))')
        .eq('is_official', true)
        .in('status', ['scheduled', 'live'])
        .order('status', { ascending: false }) // enum order: scheduled < live, so descending puts a live event first
        .order('scheduled_for', { ascending: true })
        .limit(1),
      supabase.from('poker_sessions').select(SESSION_LIST_SELECT).eq('status', 'live').order('started_at', { ascending: false }).limit(5),
    ])

  const rows = ((leaderboardRes.data ?? []) as PokerLeaderboardRow[]).map((r) => ({
    ...r,
    net_cents: Number(r.net_cents),
    staked_cents: Number(r.staked_cents),
    cashed_out_cents: Number(r.cashed_out_cents),
    rank: Number(r.rank),
  }))
  const total = Number(countRes.data ?? 0) || 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const entries = (entriesRes.data ?? []) as PokerCountedEntry[]
  const periodSessions = (sessionsRes.data ?? []) as Pick<
    PokerSessionRow,
    'id' | 'kind' | 'title' | 'stakes' | 'variant' | 'is_official' | 'played_at' | 'total_buy_in_cents' | 'player_count'
  >[]

  // Player lookups for the superlatives (guest rows have no user)
  const userIds = Array.from(new Set(entries.map((e) => e.user_id).filter((id): id is string => id != null)))
  const players = new Map<string, PlayerRef>()
  if (userIds.length > 0) {
    const { data: users } = await supabase.from('users').select('id, display_name, profile_image_url').in('id', userIds)
    for (const u of users ?? []) players.set(u.id, { id: u.id, display_name: u.display_name, profile_image_url: u.profile_image_url })
  }

  const awards = groupAwards({ entries, sessions: periodSessions, players })

  const myEntries = user ? entries.filter((e) => e.user_id === user.id) : []
  const mySummary = user && myEntries.length > 0 ? playerSummary(myEntries) : null
  const clubStaked = periodSessions.reduce((sum, x) => sum + Number(x.total_buy_in_cents), 0)
  const clubSessions = periodSessions.length

  const [myLive, tabCounts, isOfficer] = await Promise.all([
    user ? loadLiveSessionFor(supabase, user.id) : Promise.resolve(null),
    loadPokerTabCounts(supabase, user?.id ?? null),
    user ? loadIsOfficer(supabase, user.id) : Promise.resolve(false),
  ])
  const unlinkedGuests = tabCounts.guests ?? 0
  const recent = (recentRes.data ?? []) as unknown as SessionListItem[]
  const featuredRaw = (featuredRes.data ?? [])[0] as
    | (PokerSessionRow & { session_sponsors: { position: number; sponsor: PokerSponsorRow | null }[] })
    | undefined
  const featured: FeaturedEvent | null = featuredRaw
    ? {
        ...featuredRaw,
        sponsors: (featuredRaw.session_sponsors ?? [])
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((s) => s.sponsor)
          .filter((s): s is PokerSponsorRow => s != null),
      }
    : null

  // The rail shows a table that is open right now; the host's own is already in the banner, an official one in the tournament block
  const liveNow =
    ((liveRes.data ?? []) as unknown as SessionListItem[]).find((l) => l.id !== myLive?.id && l.id !== featured?.id) ?? null

  const plabel = periodLabel(period)
  const phrase = PERIOD_PHRASE[period]
  const what = kind === 'cash' ? 'cash game' : kind === 'tournament' ? 'tournament' : 'session'
  const myNet = mySummary?.netCents ?? 0

  return (
    <AppShell>
      <PageIntro
        title="Poker"
        lede={
          clubSessions === 0 ? (
            <>No {what}s have been logged {phrase}.</>
          ) : (
            <>
              <Num>{formatCents(clubStaked, { compact: true })}</Num> has changed hands over <Num>{clubSessions}</Num> {plural(clubSessions, what)} {phrase}.
              {mySummary && (
                <>
                  {' '}
                  {myNet === 0 ? (
                    'You are even.'
                  ) : (
                    <>
                      You are {myNet > 0 ? 'up' : 'down'} <Num tone={myNet > 0 ? 'win' : 'loss'}>{formatCents(Math.abs(myNet), { compact: true })}</Num>.
                    </>
                  )}
                </>
              )}
            </>
          )
        }
        actions={
          <>
            {myLive ? (
              <TextLink href={`/poker/sessions/${myLive.id}`} className="text-sm">
                Back to your table
              </TextLink>
            ) : (
              <TextLink href={user ? '/play' : '/login?redirect=/play'} className="text-sm">
                Open a table
              </TextLink>
            )}
            {isOfficer && (
              <>
                <TextLink href="/play?kind=tournament" muted className="text-sm">
                  Schedule a tournament
                </TextLink>
                <TextLink href="/poker/sponsors" muted className="text-sm">
                  Sponsors
                </TextLink>
              </>
            )}
            <ParamSelect
              param="period"
              value={period}
              defaultValue="term"
              aria-label="Period"
              options={PERIOD_OPTIONS.map((o) => ({ value: o.value, label: o.value === 'term' || o.value === 'year' ? plabelFor(o.value) : o.label }))}
            />
          </>
        }
      />

      <PokerTabs active="ledger" sessions={tabCounts.sessions} guests={tabCounts.guests} signedIn={!!user} />

      <LiveSessionBanner session={myLive} className="mt-6" />

      {unlinkedGuests > 0 && (
        <p className="mt-5 text-[13px] text-zinc-400">
          {unlinkedGuests === 1 ? 'One guest on your ledgers has' : `${unlinkedGuests} guests on your ledgers have`} no account yet.{' '}
          <TextLink href="/poker/guests" className="text-[13px]">
            Link accounts
          </TextLink>
        </p>
      )}

      {/* Time-sensitive panels lead on narrow screens; from lg they sit in the rail */}
      {(liveNow || featured) && (
        <div className="mt-6 space-y-6 lg:hidden">
          {liveNow && <LiveNowPanel session={liveNow} viewerId={user?.id ?? null} />}
          {featured && <FeaturedEventCard event={featured} />}
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-x-[72px] gap-y-12">
        <section className="min-w-0 flex-[999_1_560px]">
          <PokerLeaderboardClient
            rows={rows}
            total={total}
            kind={kind}
            sort={sort}
            dorms={dorms ?? []}
            selectedDormId={dormId}
            currentPage={page}
            totalPages={totalPages}
            currentUserId={user?.id ?? null}
          />
        </section>

        <aside className="min-w-0 flex-[1_1_300px] space-y-7 pt-3.5 lg:max-w-[400px]">
          {liveNow && (
            <div className="hidden lg:block">
              <LiveNowPanel session={liveNow} viewerId={user?.id ?? null} />
            </div>
          )}

          {featured && (
            <div className="hidden lg:block">
              <FeaturedEventCard event={featured} />
            </div>
          )}

          <section>
            <div className="flex items-baseline justify-between gap-3 border-b border-line-strong pb-2.5">
              <h2 className="font-sans text-xs tracking-normal text-mute">Recent nights</h2>
              <TextLink href="/poker/sessions" className="text-xs">
                All sessions
              </TextLink>
            </div>
            {recent.length === 0 ? (
              <p className="border-b border-line py-3 text-sm text-mute">No sessions logged yet.</p>
            ) : (
              recent.map((s) => <SessionCard key={s.id} session={s} viewerId={user?.id ?? null} />)
            )}
          </section>

          {entries.length > 0 && <HallOfFame awards={awards} heading={period === 'term' ? 'This term' : plabel.charAt(0).toUpperCase() + plabel.slice(1)} />}
        </aside>
      </div>
    </AppShell>
  )
}

function plabelFor(period: PokerPeriod): string {
  return periodLabel(period)
}
