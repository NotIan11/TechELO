import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/layout/AppShell'
import Button from '@/components/ui/Button'
import MoneyDelta from '@/components/ui/MoneyDelta'
import PageHeader from '@/components/ui/PageHeader'
import SectionHeader from '@/components/ui/SectionHeader'
import StatTile from '@/components/ui/StatTile'
import TextLink from '@/components/ui/TextLink'
import FeaturedEventCard, { type FeaturedEvent } from '@/components/poker/FeaturedEventCard'
import HallOfFame from '@/components/poker/HallOfFame'
import LiveSessionBanner from '@/components/poker/LiveSessionBanner'
import PokerLeaderboardClient from '@/components/poker/PokerLeaderboardClient'
import SessionCard, { type SessionListItem } from '@/components/poker/SessionCard'
import { PAGE_SIZE, SHARK_MIN_SESSIONS } from '@/lib/poker/constants'
import { formatCents, formatRoi } from '@/lib/poker/money'
import { isPokerPeriod, periodBounds, periodLabel } from '@/lib/poker/periods'
import { SESSION_LIST_SELECT, loadLiveSessionFor } from '@/lib/poker/queries'
import { groupAwards, playerSummary, sessionResults } from '@/lib/poker/stats'
import type { PlayerRef, PokerCountedEntry, PokerKindFilter, PokerLeaderboardRow, PokerSessionRow, PokerSort, PokerSponsorRow } from '@/lib/poker/types'

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

  const [{ data: { user } }, leaderboardRes, countRes, { data: dorms }, entriesRes, sessionsRes, recentRes, featuredRes] =
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

  // Player lookups for awards + form dots
  const userIds = Array.from(new Set(entries.map((e) => e.user_id)))
  const players = new Map<string, PlayerRef>()
  if (userIds.length > 0) {
    const { data: users } = await supabase.from('users').select('id, display_name, profile_image_url').in('id', userIds)
    for (const u of users ?? []) players.set(u.id, { id: u.id, display_name: u.display_name, profile_image_url: u.profile_image_url })
  }
  const byUser = new Map<string, PokerCountedEntry[]>()
  for (const e of entries) {
    const list = byUser.get(e.user_id) ?? []
    list.push(e)
    byUser.set(e.user_id, list)
  }
  const formByUser: Record<string, ('W' | 'L')[]> = {}
  for (const r of rows) formByUser[r.user_id] = sessionResults(byUser.get(r.user_id) ?? [], 5)

  const awards = groupAwards({ entries, sessions: periodSessions, players })

  // Tiles
  const mySummary = user ? playerSummary(byUser.get(user.id) ?? []) : null
  const clubStaked = periodSessions.reduce((s, x) => s + Number(x.total_buy_in_cents), 0)
  const clubSessions = periodSessions.length
  const clubPlayers = userIds.length
  const biggestNight = periodSessions.reduce((m, x) => Math.max(m, Number(x.total_buy_in_cents)), 0)

  const myLive = user ? await loadLiveSessionFor(supabase, user.id) : null
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

  const plabel = periodLabel(period)

  return (
    <AppShell promo="tables">
      <PageHeader
        eyebrow="Poker"
        title="The ledger"
        subtitle={` · cash games and tournaments, confirmed by everyone at the table`}
        actions={
          user ? (
            myLive ? (
              <Button href={`/poker/sessions/`}>Resume live session</Button>
            ) : (
              <>
                <Button href="/poker/sessions/new">Start a game</Button>
                <Button href="/poker/sessions/new?kind=tournament" variant="secondary">
                  Start a tournament
                </Button>
              </>
            )
          ) : (
            <Button href="/login?redirect=/poker/sessions/new" variant="secondary">
              Sign in to log a session
            </Button>
          )
        }
      />

      <LiveSessionBanner session={myLive} />

      <div className="space-y-10">
        {featured && <FeaturedEventCard event={featured} />}

        {/* Tiles */}
        {mySummary && mySummary.sessions > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatTile label={`Your net · ${plabel}`} value={<MoneyDelta cents={mySummary.netCents} size="lg" compact />} />
            <StatTile label="Sessions" value={mySummary.sessions} sub={`${Math.round(mySummary.winningPct ?? 0)}% winning`} />
            <StatTile label="ROI" value={formatRoi(mySummary.roiPct)} tone={mySummary.roiPct == null ? 'muted' : mySummary.roiPct >= 0 ? 'positive' : 'negative'} sub={`${formatCents(mySummary.stakedCents, { compact: true })} staked`} />
            <StatTile
              label="Streak"
              value={mySummary.currentStreak ? `${mySummary.currentStreak.count}${mySummary.currentStreak.type}` : '—'}
              tone={mySummary.currentStreak?.type === 'W' ? 'positive' : mySummary.currentStreak?.type === 'L' ? 'negative' : 'muted'}
              sub={mySummary.currentStreak ? (mySummary.currentStreak.type === 'W' ? 'winning sessions in a row' : 'losing sessions in a row') : 'no active streak'}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatTile label={`Changed hands · ${plabel}`} value={formatCents(clubStaked, { compact: true })} tone="orange" />
            <StatTile label="Sessions logged" value={clubSessions} />
            <StatTile label="Players" value={clubPlayers} />
            <StatTile label="Biggest night" value={formatCents(biggestNight, { compact: true })} />
          </div>
        )}

        {/* Leaderboard */}
        <section>
          <SectionHeader title={`Leaderboard · ${plabel}`} />
          <PokerLeaderboardClient
            rows={rows}
            formByUser={formByUser}
            kind={kind}
            period={period}
            sort={sort}
            dorms={dorms ?? []}
            selectedDormId={dormId}
            currentPage={page}
            totalPages={totalPages}
            currentUserId={user?.id ?? null}
          />
        </section>

        {/* Recent sessions */}
        <section>
          <SectionHeader title="Recent sessions" aside={<TextLink href="/poker/sessions" arrow="right">See all</TextLink>} />
          {recent.length === 0 ? (
            <p className="text-sm text-zinc-500">No sessions logged yet.</p>
          ) : (
            <div className="space-y-3">
              {recent.map((s) => (
                <SessionCard key={s.id} session={s} viewerId={user?.id ?? null} />
              ))}
            </div>
          )}
        </section>

        {entries.length > 0 && <HallOfFame awards={awards} periodLabel={plabel} />}
      </div>
    </AppShell>
  )
}
