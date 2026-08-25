import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/layout/AppShell'
import PromoPanel from '@/components/layout/PromoPanel'
import PlayMenu from '@/components/home/PlayMenu'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import GameIcon from '@/components/ui/GameIcon'
import Hero from '@/components/ui/Hero'
import MoneyDelta from '@/components/ui/MoneyDelta'
import RankRing from '@/components/ui/RankRing'
import TextLink from '@/components/ui/TextLink'
import { getInboxCount } from '@/lib/inbox'
import { getHouseStandings } from '@/lib/houses'
import { CHALLENGE_EXPIRY_MS, cn, getHouseColor } from '@/lib/utils'
import { formatCents } from '@/lib/poker/money'
import { formatPokerDateTime, periodBounds, termFor } from '@/lib/poker/periods'
import { loadLiveSessionFor } from '@/lib/poker/queries'
import { sessionTitle } from '@/lib/poker/stats'
import { getMyPokerNet, getPokerPulse, getTablesPulse } from '@/lib/promo'
import type { PokerSessionRow } from '@/lib/poker/types'

type BoardRow = { user_id: string; display_name: string; rating: number; profile_image_url?: string | null }
type PokerRow = { user_id: string; display_name: string; profile_image_url: string | null; net_cents: number }

const GAMES = [
  { key: 'pool' as const, label: 'Pool' },
  { key: 'ping_pong' as const, label: 'Ping pong' },
]

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
  const { since: termSince } = periodBounds('term')
  const term = termFor()
  const openSince = new Date(Date.now() - CHALLENGE_EXPIRY_MS).toISOString()

  const [
    poolRes,
    pongRes,
    rankedRes,
    matchesTermRes,
    pokerPulse,
    pokerTopRes,
    houses,
    inPlayRes,
    openRes,
    eventRes,
    tablesPulse,
    myLive,
    myPokerNet,
    inboxCount,
  ] = await Promise.all([
    supabase.rpc('get_leaderboard', { p_game_type: 'pool', p_limit: 3, p_offset: 0, p_dorm_id: null }),
    supabase.rpc('get_leaderboard', { p_game_type: 'ping_pong', p_limit: 3, p_offset: 0, p_dorm_id: null }),
    supabase.from('elo_ratings').select('user_id').gt('matches_played', 0),
    supabase.from('matches').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('completed_at', termSince ?? '1970-01-01'),
    getPokerPulse(supabase),
    supabase.rpc('get_poker_leaderboard', {
      p_kind: null,
      p_dorm_id: null,
      p_since: termSince,
      p_until: null,
      p_sort: 'net',
      p_min_sessions: 1,
      p_limit: 5,
      p_offset: 0,
    }),
    getHouseStandings(supabase),
    supabase.from('matches').select('*', { count: 'exact', head: true }).in('status', ['in_progress', 'pending_result']),
    supabase.from('matches').select('*', { count: 'exact', head: true }).eq('status', 'pending_start').gte('created_at', openSince),
    supabase
      .from('poker_sessions')
      .select('id, kind, title, stakes, variant, is_official, played_at, scheduled_for, status, player_count, rsvp_count, location')
      .eq('is_official', true)
      .in('status', ['scheduled', 'live'])
      .order('status', { ascending: false })
      .order('scheduled_for', { ascending: true })
      .limit(1),
    user ? getTablesPulse(supabase, user.id) : Promise.resolve(null),
    user ? loadLiveSessionFor(supabase, user.id) : Promise.resolve(null),
    user ? getMyPokerNet(supabase, user.id) : Promise.resolve(null),
    user ? getInboxCount(supabase, user.id) : Promise.resolve(0),
  ])

  const boards: Record<'pool' | 'ping_pong', BoardRow[]> = {
    pool: (poolRes.data ?? []) as BoardRow[],
    ping_pong: (pongRes.data ?? []) as BoardRow[],
  }
  const boardIds = Array.from(new Set([...boards.pool, ...boards.ping_pong].map((r) => r.user_id)))
  if (boardIds.length > 0) {
    const { data: avatars } = await supabase.from('users').select('id, profile_image_url').in('id', boardIds)
    const map = new Map((avatars ?? []).map((u) => [u.id, u.profile_image_url]))
    for (const g of ['pool', 'ping_pong'] as const) boards[g] = boards[g].map((r) => ({ ...r, profile_image_url: map.get(r.user_id) ?? null }))
  }
  const rankedPlayers = new Set((rankedRes.data ?? []).map((r) => r.user_id)).size
  const matchesThisTerm = matchesTermRes.count ?? 0
  const pokerTop = pokerPulse.available ? ((pokerTopRes.data ?? []) as PokerRow[]) : []
  const event = pokerPulse.available ? ((eventRes.data ?? [])[0] as Pick<PokerSessionRow, 'id' | 'kind' | 'title' | 'stakes' | 'variant' | 'is_official' | 'played_at' | 'scheduled_for' | 'status' | 'player_count' | 'rsvp_count' | 'location'> | undefined) : undefined
  const topHouses = houses.filter((h) => h.rankedPlayers > 0).slice(0, 3)

  const laneRow = (rank: number, avatar: string | null | undefined, name: string, href: string, value: React.ReactNode) => (
    <li key={href}>
      <Link href={href} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition hover:bg-ink-700">
        <RankRing rank={rank} />
        <Avatar src={avatar} name={name} size="xs" />
        <span className="min-w-0 flex-1 truncate text-sm text-white">{name}</span>
        {value}
      </Link>
    </li>
  )

  return (
    <AppShell promo="none">
      <Hero
        eyebrow="Caltech house games"
        title="Settle it at the table."
        lede="Ratings for pool and ping pong, a ledger for poker. Every result confirmed by the people you played."
        actions={
          user ? (
            myLive ? (
              <Button href={`/poker/sessions/${myLive.id}`} size="lg">
                Resume live session
              </Button>
            ) : (
              <PlayMenu />
            )
          ) : (
            <>
              <Button href="/signup" size="lg">
                Join
              </Button>
              <TextLink href="/login" className="text-sm">
                Sign in
              </TextLink>
            </>
          )
        }
      />

      <div className="space-y-6">
        {/* You */}
        {user && (
          <Card padding="sm">
            <ul className="tabular flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
              {GAMES.map((g) => {
                const mine = tablesPulse?.me?.find((m) => m.game === g.key)
                return (
                  <li key={g.key} className="text-zinc-300">
                    {g.label}{' '}
                    {mine ? (
                      <>
                        <span className="text-white">#{mine.rank}</span> · {mine.rating.toLocaleString('en-US')}
                      </>
                    ) : (
                      <span className="text-zinc-500">· unranked</span>
                    )}
                  </li>
                )
              })}
              <li className="text-zinc-300">
                Poker{' '}
                {myPokerNet != null ? (
                  <>
                    <MoneyDelta cents={myPokerNet} compact /> this term
                  </>
                ) : (
                  <span className="text-zinc-500">· no sessions yet</span>
                )}
              </li>
              <li>
                <Link href="/inbox" className={cn('transition hover:underline', inboxCount > 0 ? 'text-orange-400' : 'text-zinc-500')}>
                  {inboxCount > 0 ? `${inboxCount} waiting in your inbox` : 'Inbox is clear'}
                </Link>
              </li>
            </ul>
          </Card>
        )}

        {/* Lanes */}
        <div id="play" className="grid gap-4 md:grid-cols-2 md:items-stretch">
          <PromoPanel
            eyebrow="Table games"
            line={<span className="font-display text-lg font-semibold">Pool and ping pong</span>}
            sub={`${rankedPlayers} ranked player${rankedPlayers === 1 ? '' : 's'} · ${matchesThisTerm} match${matchesThisTerm === 1 ? '' : 'es'} this term`}
            className="h-full"
            footer={
              <>
                <Button href={user ? '/matches/new' : '/login?redirect=/matches/new'}>Challenge someone</Button>
                <TextLink href="/leaderboard" arrow="right" className="text-sm">
                  Full rankings
                </TextLink>
              </>
            }
          >
            <div className="grid grid-cols-2 gap-4">
              {GAMES.map((g) => (
                <div key={g.key} className="min-w-0">
                  <Link href={`/leaderboard?game_type=${g.key}`} className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-zinc-400 transition hover:text-white">
                    <GameIcon game={g.key} size="xs" /> {g.label}
                  </Link>
                  {boards[g.key].length === 0 ? (
                    <p className="px-1.5 text-xs text-zinc-600">No ranked players yet.</p>
                  ) : (
                    <ul>
                      {boards[g.key].map((r, i) =>
                        laneRow(i + 1, r.profile_image_url, r.display_name, `/profile/${r.user_id}`, (
                          <span className="tabular font-display text-sm font-bold text-white">{r.rating}</span>
                        ))
                      )}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </PromoPanel>

          <PromoPanel
            eyebrow="Poker"
            live={pokerPulse.liveCount > 0}
            line={<span className="font-display text-lg font-semibold">Cash games and tournaments</span>}
            sub={
              !pokerPulse.available
                ? 'The ledger is not set up yet.'
                : pokerPulse.term.sessions > 0
                  ? `${formatCents(pokerPulse.term.stakedCents, { compact: true })} changed hands · ${pokerPulse.term.sessions} session${pokerPulse.term.sessions === 1 ? '' : 's'} · ${term.label}`
                  : 'Nobody has logged a session this term.'
            }
            className="h-full"
            footer={
              <>
                {myLive ? (
                  <Button href={`/poker/sessions/${myLive.id}`}>Resume live session</Button>
                ) : (
                  <Button href={user ? '/poker/sessions/new' : '/login?redirect=/poker/sessions/new'} disabled={!pokerPulse.available}>
                    Start a game
                  </Button>
                )}
                <TextLink href="/poker" arrow="right" className="text-sm">
                  Full ledger
                </TextLink>
              </>
            }
          >
            {pokerPulse.live && (
              <Link href={`/poker/sessions/${pokerPulse.live.id}`} className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-loss/20 bg-loss/5 px-3 py-2.5 transition hover:bg-loss/10">
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <Badge tone="live">Live</Badge>
                    <span className="truncate text-sm font-semibold text-white">{pokerPulse.live.title}</span>
                  </span>
                  <span className="tabular mt-0.5 block text-xs text-zinc-500">
                    {pokerPulse.live.playerCount} player{pokerPulse.live.playerCount === 1 ? '' : 's'} · {formatCents(pokerPulse.live.inPlayCents, { compact: true })} in play
                    {pokerPulse.live.hostName && <> · hosted by {pokerPulse.live.hostName}</>}
                  </span>
                </span>
              </Link>
            )}
            <p className="mb-2 px-1.5 text-xs font-semibold text-zinc-400">Top 5 · {term.label}</p>
            {pokerTop.length === 0 ? (
              <p className="px-1.5 text-xs text-zinc-600">No results yet this term.</p>
            ) : (
              <ul>
                {pokerTop.map((r, i) =>
                  laneRow(i + 1, r.profile_image_url, r.display_name, `/profile/${r.user_id}`, <MoneyDelta cents={Number(r.net_cents)} chip compact />)
                )}
              </ul>
            )}
          </PromoPanel>
        </div>

        {/* Right now */}
        <Card padding="none" className="overflow-hidden">
          <div className="grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <Link href="/poker/sessions" className="block p-4 transition hover:bg-ink-700">
              <p className="eyebrow">Live poker</p>
              <p className="tabular mt-1 font-display text-2xl font-bold text-white">{pokerPulse.liveCount > 0 ? `${pokerPulse.liveCount} live` : 'None live'}</p>
              <p className="mt-0.5 truncate text-xs text-zinc-500">{pokerPulse.live ? pokerPulse.live.title : 'Start one and it shows here'}</p>
            </Link>
            <Link href="/matches" className="block p-4 transition hover:bg-ink-700">
              <p className="eyebrow">Matches in play</p>
              <p className="tabular mt-1 font-display text-2xl font-bold text-white">{inPlayRes.count ?? 0}</p>
              <p className="mt-0.5 truncate text-xs text-zinc-500">plus {openRes.count ?? 0} open challenge{(openRes.count ?? 0) === 1 ? '' : 's'}</p>
            </Link>
            <Link href={event ? `/poker/sessions/${event.id}` : '/poker'} className="block p-4 transition hover:bg-ink-700">
              <p className="eyebrow">Next official tournament</p>
              <p className="mt-1 truncate font-display text-2xl font-bold text-white">{event ? sessionTitle(event) : 'None scheduled'}</p>
              <p className="tabular mt-0.5 truncate text-xs text-zinc-500">
                {event
                  ? event.status === 'live'
                    ? 'Cards are in the air'
                    : `${event.scheduled_for ? formatPokerDateTime(event.scheduled_for) : 'Date TBA'} · ${event.rsvp_count} RSVP${event.rsvp_count === 1 ? '' : 's'}`
                  : 'The club runs one each term'}
              </p>
            </Link>
          </div>
        </Card>

        {/* Houses */}
        <Card>
          <div className="mb-3 flex items-baseline justify-between">
            <p className="eyebrow">House Cup</p>
            <TextLink href="/dorms" arrow="right" className="text-xs">
              All houses
            </TextLink>
          </div>
          {topHouses.length === 0 ? (
            <p className="text-sm text-zinc-500">Standings appear once a house has a ranked player.</p>
          ) : (
            <ul className="divide-y divide-line">
              {topHouses.map((h, i) => (
                <li key={h.id}>
                  <Link href={`/dorms/${h.id}`} className="flex items-center gap-3 py-2.5 transition hover:text-orange-400">
                    <RankRing rank={i + 1} />
                    <span className="h-2 w-2 shrink-0 rounded-full ring-1 ring-white/20" style={{ backgroundColor: getHouseColor(h.name) }} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">{h.name}</span>
                    <span className="tabular hidden text-xs text-zinc-500 sm:inline">{h.totalWins} wins</span>
                    <span className="tabular font-display text-sm font-bold text-white">{h.avgRating}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  )
}
