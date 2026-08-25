import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/layout/AppShell'
import PromoPanel from '@/components/layout/PromoPanel'
import PlayMenu from '@/components/home/PlayMenu'
import Button from '@/components/ui/Button'
import GameIcon from '@/components/ui/GameIcon'
import Hero from '@/components/ui/Hero'
import RankRing from '@/components/ui/RankRing'
import TextLink from '@/components/ui/TextLink'
import { getInboxCount } from '@/lib/inbox'
import { cn } from '@/lib/utils'
import { formatCents } from '@/lib/poker/money'
import { periodBounds, termFor } from '@/lib/poker/periods'
import { loadLiveSessionFor } from '@/lib/poker/queries'
import { getMyPokerNet, getPokerPulse, getTablesPulse } from '@/lib/promo'

type BoardRow = { user_id: string; display_name: string; rating: number }
type PokerRow = { user_id: string; display_name: string; net_cents: number }

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

  const [poolRes, pongRes, rankedRes, matchesTermRes, pokerPulse, pokerTopRes, tablesPulse, myLive, myPokerNet, inboxCount] =
    await Promise.all([
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
        p_limit: 3,
        p_offset: 0,
      }),
      user ? getTablesPulse(supabase, user.id) : Promise.resolve(null),
      user ? loadLiveSessionFor(supabase, user.id) : Promise.resolve(null),
      user ? getMyPokerNet(supabase, user.id) : Promise.resolve(null),
      user ? getInboxCount(supabase, user.id) : Promise.resolve(0),
    ])

  const boards: Record<'pool' | 'ping_pong', BoardRow[]> = {
    pool: (poolRes.data ?? []) as BoardRow[],
    ping_pong: (pongRes.data ?? []) as BoardRow[],
  }
  const rankedPlayers = new Set((rankedRes.data ?? []).map((r) => r.user_id)).size
  const matchesThisTerm = matchesTermRes.count ?? 0
  const pokerTop = pokerPulse.available ? ((pokerTopRes.data ?? []) as PokerRow[]) : []

  const laneRow = (rank: number, name: string, href: string, value: React.ReactNode) => (
    <li key={href}>
      <Link href={href} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition hover:bg-ink-700">
        <RankRing rank={rank} />
        <span className="min-w-0 flex-1 truncate text-sm text-white">{name}</span>
        {value}
      </Link>
    </li>
  )

  const youLine =
    user &&
    [
      ...GAMES.map((g) => {
        const mine = tablesPulse?.me?.find((m) => m.game === g.key)
        return mine ? `${g.label} #${mine.rank} · ${mine.rating.toLocaleString('en-US')}` : `${g.label} unranked`
      }),
      myPokerNet != null ? `Poker ${formatCents(myPokerNet, { sign: true, compact: true })} this term` : 'Poker · no sessions yet',
    ].join(' · ')

  const pokerSub = !pokerPulse.available
    ? 'The ledger is not set up yet.'
    : pokerPulse.term.sessions > 0
      ? `${formatCents(pokerPulse.term.stakedCents, { compact: true })} changed hands · ${pokerPulse.term.sessions} session${pokerPulse.term.sessions === 1 ? '' : 's'} · ${term.label}`
      : 'Nobody has logged a session this term.'

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
      >
        {youLine && (
          <p className="tabular mt-5 text-[13px] text-zinc-500">
            {youLine}
            {' · '}
            <Link href="/inbox" className={cn('transition hover:underline', inboxCount > 0 ? 'text-orange-400' : 'text-zinc-500')}>
              {inboxCount > 0 ? `${inboxCount} in your inbox` : 'Inbox clear'}
            </Link>
          </p>
        )}
      </Hero>

      <div id="play" className="grid gap-4 md:grid-cols-2 md:items-stretch">
        <PromoPanel
          eyebrow="Table games"
          line={
            <Link href="/leaderboard" className="font-display text-lg font-semibold text-white transition hover:text-orange-400">
              Pool and ping pong
            </Link>
          }
          sub={`${rankedPlayers} ranked player${rankedPlayers === 1 ? '' : 's'} · ${matchesThisTerm} match${matchesThisTerm === 1 ? '' : 'es'} this term`}
          className="h-full"
          footer={<Button href={user ? '/matches/new' : '/login?redirect=/matches/new'}>Challenge someone</Button>}
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
                      laneRow(i + 1, r.display_name, `/profile/${r.user_id}`, <span className="tabular font-display text-sm font-bold text-white">{r.rating}</span>)
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
          line={
            <Link href="/poker" className="font-display text-lg font-semibold text-white transition hover:text-orange-400">
              Cash games and tournaments
            </Link>
          }
          sub={
            pokerPulse.live ? (
              <Link href={`/poker/sessions/${pokerPulse.live.id}`} className="transition hover:text-zinc-300">
                Live now · {pokerPulse.live.title} · {pokerPulse.live.playerCount} player{pokerPulse.live.playerCount === 1 ? '' : 's'}
              </Link>
            ) : (
              pokerSub
            )
          }
          className="h-full"
          footer={
            myLive ? (
              <Button href={`/poker/sessions/${myLive.id}`}>Resume live session</Button>
            ) : (
              <Button href={user ? '/poker/sessions/new' : '/login?redirect=/poker/sessions/new'} disabled={!pokerPulse.available}>
                Start a game
              </Button>
            )
          }
        >
          {pokerTop.length === 0 ? (
            <p className="px-1.5 text-xs text-zinc-600">{pokerPulse.available ? 'No results yet this term.' : ''}</p>
          ) : (
            <ul>
              {pokerTop.map((r, i) => {
                const net = Number(r.net_cents)
                return laneRow(
                  i + 1,
                  r.display_name,
                  `/profile/${r.user_id}`,
                  <span className={cn('tabular text-sm font-semibold', net > 0 ? 'text-win' : net < 0 ? 'text-loss' : 'text-zinc-500')}>
                    {formatCents(net, { sign: true, compact: true })}
                  </span>
                )
              })}
            </ul>
          )}
        </PromoPanel>
      </div>
    </AppShell>
  )
}
