import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/layout/AppShell'
import InboxClient from '@/components/inbox/InboxClient'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Figure from '@/components/ui/Figure'
import MoneyDelta, { Money } from '@/components/ui/MoneyDelta'
import PageIntro from '@/components/ui/PageIntro'
import SectionHeader from '@/components/ui/SectionHeader'
import Sparkline from '@/components/ui/Sparkline'
import TextLink from '@/components/ui/TextLink'
import TimeAgo from '@/components/ui/TimeAgo'
import { getInboxItems, waitingHeadline } from '@/lib/inbox'
import { formatCents } from '@/lib/poker/money'
import { TIME_ZONE, termFor } from '@/lib/poker/periods'
import { loadLiveSessionFor } from '@/lib/poker/queries'
import { sessionTitle } from '@/lib/poker/stats'
import { getGameStanding, getMyPokerTerm, getPokerPulse, getTablesPulse, type GameStanding, type TableGame } from '@/lib/promo'
import { currentStreak, daysAgo, ratingChangesSince, ratingHistory, recentForm, type CompletedMatchLike } from '@/lib/stats'

const GAMES: { key: TableGame; label: string; lower: string }[] = [
  { key: 'pool', label: 'Pool', lower: 'pool' },
  { key: 'ping_pong', label: 'Ping pong', lower: 'ping pong' },
]

const FEED_ROWS = 6

const signed = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n)}`
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

interface FeedRow {
  key: string
  at: string
  href: string
  text: string
  value: React.ReactNode
}

type RecentMatchRow = {
  id: string
  game_type: string
  winner_id: string | null
  player1_id: string
  player2_id: string
  player1_elo_after: number | null
  player2_elo_after: number | null
  completed_at: string | null
  created_at: string
  player1: { display_name: string } | null
  player2: { display_name: string } | null
}

type RecentSessionRow = {
  id: string
  kind: 'cash' | 'tournament'
  title: string | null
  stakes: string | null
  variant: string | null
  is_official: boolean
  played_at: string
  scheduled_for: string | null
  player_count: number
  total_buy_in_cents: number
  entries: { net_cents: number; user: { display_name: string } | null; guest: { name: string } | null }[] | null
}

function matchFeedRow(m: RecentMatchRow): FeedRow {
  const p1Won = m.winner_id === m.player1_id
  const winner = (p1Won ? m.player1 : m.player2)?.display_name ?? 'Someone'
  const loser = (p1Won ? m.player2 : m.player1)?.display_name ?? 'someone'
  const rating = p1Won ? m.player1_elo_after : m.player2_elo_after
  return {
    key: `match:${m.id}`,
    at: m.completed_at ?? m.created_at,
    href: `/matches/${m.id}`,
    text: `${winner} beat ${loser} at ${m.game_type === 'ping_pong' ? 'ping pong' : 'pool'}`,
    value: rating ?? '',
  }
}

function sessionFeedRow(s: RecentSessionRow): FeedRow {
  const title = sessionTitle(s)
  const best = (s.entries ?? []).reduce<{ name: string; net: number } | null>((top, e) => {
    const net = Number(e.net_cents)
    const name = e.user?.display_name ?? e.guest?.name
    return name && net > 0 && (!top || net > top.net) ? { name, net } : top
  }, null)
  return {
    key: `session:${s.id}`,
    at: s.played_at,
    href: `/poker/sessions/${s.id}`,
    text: best ? `${best.name} came out ahead at ${title}` : `${title} · ${plural(s.player_count, 'player')}`,
    value: best ? <MoneyDelta cents={best.net} compact /> : <Money cents={Number(s.total_buy_in_cents)} compact />,
  }
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error_code?: string }>
}) {
  const params = await searchParams
  if (params.error_code === 'otp_expired') {
    redirect('/login?error=link_expired')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const term = termFor()

  if (!user) {
    const [tables, poker] = await Promise.all([getTablesPulse(supabase, null), getPokerPulse(supabase)])
    const leader = poker.term.leader
    return (
      <AppShell>
        <PageIntro
          kicker="Caltech house games"
          title="Settle it at the table."
          lede="Ratings for pool and ping pong, a ledger for poker. Every result confirmed by the people you played."
        />
        <div className="mt-8 flex flex-wrap items-center gap-5">
          <Button href="/signup" size="lg">
            Join
          </Button>
          <TextLink href="/login" className="text-sm">
            Sign in
          </TextLink>
        </div>

        <div className="mt-16 grid gap-x-12 border-t border-line-bright sm:grid-cols-3">
          {GAMES.map((g) => {
            const top = tables.leaders.find((l) => l.game === g.key)
            return (
              <Link key={g.key} href={`/leaderboard?game_type=${g.key}`} className="block border-b border-line py-5 transition hover:border-line-bright">
                <Figure label={`First at ${g.lower}`} value={top ? top.rating : '—'} tone={top ? 'default' : 'muted'}>
                  {top ? top.name : 'Nobody is ranked yet.'}
                </Figure>
              </Link>
            )
          })}
          <Link href="/poker" className="block border-b border-line py-5 transition hover:border-line-bright">
            <Figure
              label={`Poker leader, ${term.label}`}
              value={leader ? formatCents(leader.netCents, { sign: true, compact: true }) : '—'}
              tone={leader ? (leader.netCents > 0 ? 'win' : leader.netCents < 0 ? 'loss' : 'default') : 'muted'}
            >
              {leader ? leader.name : 'Nobody has logged a session this term.'}
            </Figure>
          </Link>
        </div>
      </AppShell>
    )
  }

  const [items, poolStanding, pongStanding, myMatchesRes, myPoker, pokerPulse, myLive, recentMatchesRes, recentSessionsRes] = await Promise.all([
    getInboxItems(supabase, user.id),
    getGameStanding(supabase, user.id, 'pool'),
    getGameStanding(supabase, user.id, 'ping_pong'),
    supabase
      .from('matches')
      .select('player1_id, player2_id, winner_id, player1_elo_before, player2_elo_before, player1_elo_after, player2_elo_after, game_type, completed_at, created_at')
      .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(200),
    getMyPokerTerm(supabase, user.id),
    getPokerPulse(supabase),
    loadLiveSessionFor(supabase, user.id),
    supabase
      .from('matches')
      .select(
        'id, game_type, winner_id, player1_id, player2_id, player1_elo_after, player2_elo_after, completed_at, created_at, player1:users!player1_id(display_name), player2:users!player2_id(display_name)'
      )
      .eq('status', 'completed')
      .not('winner_id', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(FEED_ROWS),
    supabase
      .from('poker_sessions')
      .select(
        'id, kind, title, stakes, variant, is_official, played_at, scheduled_for, player_count, total_buy_in_cents, entries:poker_entries(net_cents, user:users(display_name), guest:poker_guests(name))'
      )
      .in('status', ['final', 'disputed'])
      .order('played_at', { ascending: false })
      .limit(FEED_ROWS),
  ])

  // Current ratings for everyone in the queue, so each row can say what is at stake
  const queuePlayerIds = new Set<string>()
  for (const item of items) {
    if (item.kind === 'match') {
      queuePlayerIds.add(item.match.player1_id)
      queuePlayerIds.add(item.match.player2_id)
    }
  }
  const queueRatings: Record<string, Record<string, number>> = {}
  if (queuePlayerIds.size > 0) {
    const { data: ratingRows } = await supabase.from('elo_ratings').select('user_id, game_type, rating').in('user_id', [...queuePlayerIds])
    for (const r of ratingRows ?? []) {
      ;(queueRatings[r.user_id] ??= {})[r.game_type] = r.rating
    }
  }

  const myMatches = (myMatchesRes.data ?? []) as CompletedMatchLike[]
  const standings: Record<TableGame, GameStanding> = { pool: poolStanding, ping_pong: pongStanding }
  const weekAgo = daysAgo(7)

  const feed = [
    ...((recentMatchesRes.data ?? []) as unknown as RecentMatchRow[]).map(matchFeedRow),
    ...((recentSessionsRes.data ?? []) as unknown as RecentSessionRow[]).map(sessionFeedRow),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, FEED_ROWS)

  const today = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, weekday: 'long', month: 'short', day: 'numeric' }).format(new Date())
  const live = pokerPulse.live

  return (
    <AppShell>
      <div className="grid gap-x-[72px] gap-y-14 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
        <div className="min-w-0">
          <PageIntro
            kicker={`${today} · ${term.label}`}
            title={waitingHeadline(items.length)}
            actions={
              myLive ? (
                <Button href={`/poker/sessions/${myLive.id}`} variant="outline">
                  Back to your table
                </Button>
              ) : undefined
            }
          />

          <div className="mt-9">
            <InboxClient items={items} currentUserId={user.id} ratings={queueRatings} />
          </div>

          <section className="mt-14">
            <SectionHeader title="Around the houses" />
            {live && (
              <Link href={`/poker/sessions/${live.id}`} className="flex items-baseline gap-5 border-b border-line py-3.5 transition hover:border-line-bright">
                <span className="w-[88px] shrink-0">
                  <Badge tone="live">Live</Badge>
                </span>
                <span className="min-w-0 flex-1 text-sm text-white">
                  {live.title} · {plural(live.playerCount, 'player')}
                </span>
                <span className="tabular whitespace-nowrap text-sm text-zinc-300">{formatCents(live.inPlayCents, { compact: true })} on the table</span>
              </Link>
            )}
            {feed.map((f) => (
              <Link key={f.key} href={f.href} className="flex items-baseline gap-5 border-b border-line py-3.5 transition hover:border-line-bright">
                <TimeAgo date={f.at} className="w-[88px] shrink-0 text-xs text-mute" />
                <span className="min-w-0 flex-1 text-sm text-zinc-300">{f.text}</span>
                <span className="tabular whitespace-nowrap text-sm text-zinc-300">{f.value}</span>
              </Link>
            ))}
            {!live && feed.length === 0 && <p className="border-b border-line py-3.5 text-sm text-mute">No results yet. The first confirmed match shows up here.</p>}
          </section>
        </div>

        <aside className="min-w-0">
          <p className="border-b border-line-bright pb-3 text-[13px] text-mute">You</p>

          {GAMES.map((g) => {
            const s = standings[g.key]
            const href = `/leaderboard?game_type=${g.key}`
            if (!s.ranked) {
              return (
                <Link key={g.key} href={href} className="block border-b border-line py-5 transition hover:border-line-bright">
                  <Figure label={g.label} aside="Unranked" value={s.rating} tone="muted">
                    One confirmed match puts you on the board.
                  </Figure>
                </Link>
              )
            }
            const history = ratingHistory(myMatches, user.id, g.key).slice(-20)
            const week = ratingChangesSince(myMatches, weekAgo, g.key)[user.id]
            const streak = currentStreak(recentForm(myMatches, user.id, g.key, 50))
            const streakText = streak
              ? streak.count >= 2
                ? `${streak.count} ${streak.type === 'W' ? 'wins' : 'losses'} in a row`
                : streak.type === 'W'
                  ? 'won the last one'
                  : 'lost the last one'
              : null
            return (
              <Link key={g.key} href={href} className="relative block border-b border-line py-5 transition hover:border-line-bright">
                <Figure label={g.label} aside={<span className="tabular">{`#${s.rank} of ${s.total}`}</span>} value={s.rating}>
                  {week != null ? (
                    <>
                      <span className={`tabular ${week > 0 ? 'text-win' : week < 0 ? 'text-loss' : 'text-zinc-400'}`}>{signed(week)}</span> this week
                    </>
                  ) : (
                    'No matches this week'
                  )}
                  {streakText && ` · ${streakText}`}
                </Figure>
                <Sparkline values={history} width={120} height={36} className="absolute right-0 top-[52px] text-white" />
              </Link>
            )
          })}

          <Link href="/poker" className="block border-b border-line py-5 transition hover:border-line-bright">
            {myPoker ? (
              <Figure
                label={`Poker, ${term.label}`}
                value={formatCents(myPoker.netCents, { sign: true, compact: true })}
                tone={myPoker.netCents > 0 ? 'win' : myPoker.netCents < 0 ? 'loss' : 'default'}
              >
                <span className="tabular">{myPoker.sessions}</span> {myPoker.sessions === 1 ? 'session' : 'sessions'} ·{' '}
                <span className="tabular">{formatCents(myPoker.stakedCents, { compact: true })}</span> staked
              </Figure>
            ) : (
              <Figure label={`Poker, ${term.label}`} value="$0" tone="muted">
                No sessions logged this term.
              </Figure>
            )}
          </Link>

          {GAMES.map((g) => {
            const s = standings[g.key]
            const reach = s.ranked ? [s.above && { ...s.above, where: 'above' }, s.below && { ...s.below, where: 'below' }].filter((n) => !!n) : []
            if (reach.length === 0) return null
            return (
              <section key={g.key} className="mt-10">
                <SectionHeader title={`Within reach at ${g.lower}`} />
                {reach.map((n) => (
                  <div key={n.id} className="flex items-center gap-3 border-b border-line py-2">
                    <span className="tabular w-6 shrink-0 text-sm text-mute">{n.rank}</span>
                    <span className="min-w-0 flex-1">
                      <Link href={`/profile/${n.id}`} className="block truncate text-sm text-white hover:underline">
                        {n.name}
                      </Link>
                      <span className="block text-xs text-mute">
                        {n.gap === 0 ? 'Level with you' : <><span className="tabular">{n.gap}</span> {n.gap === 1 ? 'point' : 'points'} {n.where} you</>}
                      </span>
                    </span>
                    <TextLink href={`/play?opponent=${n.id}&game_type=${g.key}`} className="min-h-[44px] text-[13px]">
                      Challenge
                    </TextLink>
                  </div>
                ))}
              </section>
            )
          })}
        </aside>
      </div>
    </AppShell>
  )
}
