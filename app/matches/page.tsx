import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import { Table, Td, Th, Tr } from '@/components/ui/DataTable'
import PageIntro, { Num } from '@/components/ui/PageIntro'
import Tabs from '@/components/ui/Tabs'
import TextLink from '@/components/ui/TextLink'
import TimeAgo from '@/components/ui/TimeAgo'
import ExpiresIn from '@/components/match/ExpiresIn'
import OpenMatchRow from '@/components/match/OpenMatchRow'
import { calculateElo } from '@/lib/elo'
import { getGameStanding } from '@/lib/promo'
import { countWord } from '@/lib/stats'
import { formatDate, isChallengeExpired } from '@/lib/utils'

const OPEN_STATUSES = ['pending_start', 'in_progress', 'pending_result']
const LIMIT = 100

type PlayerRef = { id: string; display_name: string }
type MatchRow = {
  id: string
  game_type: string
  status: string
  player1_id: string
  player2_id: string
  winner_id: string | null
  player1_elo_before: number | null
  player2_elo_before: number | null
  player1_elo_after: number | null
  player2_elo_after: number | null
  player1_start_accepted: boolean
  player2_start_accepted: boolean
  player1_result_accepted: boolean
  player2_result_accepted: boolean
  created_at: string
  started_at: string | null
  completed_at: string | null
  player1: PlayerRef | null
  player2: PlayerRef | null
}

const signed = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n)}`

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ game_type?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/matches')
  }

  const gameType = params.game_type === 'ping_pong' ? ('ping_pong' as const) : ('pool' as const)
  const gameName = gameType === 'ping_pong' ? 'Ping pong' : 'Pool'

  const [{ data: matches }, standing] = await Promise.all([
    supabase
      .from('matches')
      .select(`
        *,
        player1:users!player1_id(id, display_name),
        player2:users!player2_id(id, display_name)
      `)
      .eq('game_type', gameType)
      .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(LIMIT),
    getGameStanding(supabase, user.id, gameType),
  ])

  const all = (matches ?? []) as unknown as MatchRow[]
  const isOpen = (m: MatchRow) => OPEN_STATUSES.includes(m.status) && !(m.status === 'pending_start' && isChallengeExpired(m.created_at))
  const open = all.filter(isOpen)
  const finished = all.filter((m) => !isOpen(m))

  // Current ratings of the people in open matches, so each row can say what is at stake
  const openOpponentIds = [...new Set(open.map((m) => (m.player1_id === user.id ? m.player2_id : m.player1_id)))]
  const currentRatings: Record<string, number> = {}
  if (openOpponentIds.length > 0) {
    const { data: ratingRows } = await supabase.from('elo_ratings').select('user_id, rating').eq('game_type', gameType).in('user_id', openOpponentIds)
    for (const r of ratingRows ?? []) currentRatings[r.user_id] = r.rating
  }

  const openWord = countWord(open.length)
  const openSentence =
    open.length === 0 ? 'Nothing is open.' : open.length === 1 ? 'One match is still open.' : `${openWord.charAt(0).toUpperCase()}${openWord.slice(1)} matches are still open.`

  return (
    <AppShell>
      <PageIntro
        title={gameName}
        lede={
          standing.played > 0 ? (
            <>
              You have played <Num>{standing.played}</Num> and won <Num>{standing.wins}</Num>. {openSentence}
            </>
          ) : (
            <>You have not finished a match yet. {openSentence}</>
          )
        }
      />

      <Tabs
        className="mt-9"
        items={[
          { href: `/leaderboard?game_type=${gameType}`, label: 'Rankings' },
          { href: `/matches?game_type=${gameType}`, label: 'Your matches', count: standing.played, active: true },
        ]}
      />

      {all.length === 0 && (
        <p className="border-b border-line py-6 text-[15px] text-zinc-400">
          No matches yet. Your rating moves once you both confirm a result.{' '}
          <TextLink href={`/play?game_type=${gameType}`} className="text-[15px]">
            Challenge someone
          </TextLink>
        </p>
      )}

      {open.length > 0 && (
        <section aria-label="Open matches">
          {open.map((m) => {
            const iAmPlayer1 = m.player1_id === user.id
            const opponent = iAmPlayer1 ? m.player2 : m.player1
            const opponentId = iAmPlayer1 ? m.player2_id : m.player1_id
            const name = opponent?.display_name ?? 'Unknown player'
            const first = name.split(/\s+/)[0]
            const myRating = standing.rating
            const theirRating = currentRatings[opponentId] ?? (iAmPlayer1 ? m.player2_elo_before : m.player1_elo_before) ?? 1500
            const stake = (
              <>
                <span className="tabular">{signed(calculateElo(myRating, theirRating, 1).ratingChange1)}</span> if you win,{' '}
                <span className="tabular">{signed(calculateElo(myRating, theirRating, 2).ratingChange1)}</span> if you lose
              </>
            )
            const iReported = iAmPlayer1 ? m.player1_result_accepted : m.player2_result_accepted
            const theyReported = iAmPlayer1 ? m.player2_result_accepted : m.player1_result_accepted

            if (m.status === 'pending_start') {
              return iAmPlayer1 ? (
                <OpenMatchRow
                  key={m.id}
                  matchId={m.id}
                  label="Challenge sent"
                  opponentName={name}
                  meta={
                    <>
                      Sent <TimeAgo date={m.created_at} /> · <ExpiresIn createdAt={m.created_at} suffix={` if ${first} does not answer`} />
                    </>
                  }
                  action={{ kind: 'withdraw' }}
                />
              ) : (
                <OpenMatchRow
                  key={m.id}
                  matchId={m.id}
                  label="Challenged you"
                  mine
                  opponentName={name}
                  meta={
                    <>
                      Sent <TimeAgo date={m.created_at} /> · <ExpiresIn createdAt={m.created_at} /> · {stake}
                    </>
                  }
                  action={{ kind: 'link', label: 'Accept or decline' }}
                />
              )
            }

            if (iReported) {
              return (
                <OpenMatchRow
                  key={m.id}
                  matchId={m.id}
                  label="Result sent"
                  opponentName={name}
                  meta={<>Your result is in. Ratings update once {first} reports the same one.</>}
                  action={{ kind: 'link', label: 'View', quiet: true }}
                />
              )
            }

            const started = m.started_at ?? m.created_at
            return m.status === 'in_progress' ? (
              <OpenMatchRow
                key={m.id}
                matchId={m.id}
                label="Playing now"
                mine
                opponentName={name}
                meta={
                  <>
                    Accepted <TimeAgo date={started} /> · {stake}
                  </>
                }
                action={{ kind: 'link', label: 'Report the result' }}
              />
            ) : (
              <OpenMatchRow
                key={m.id}
                matchId={m.id}
                label="Needs a result"
                mine
                opponentName={name}
                meta={
                  <>
                    Started <TimeAgo date={started} /> · {theyReported ? `${first} has reported, you have not` : 'neither of you has reported'}
                  </>
                }
                action={{ kind: 'link', label: 'Report the result' }}
              />
            )
          })}
        </section>
      )}

      {finished.length > 0 && (
        <>
          <Table className="mt-10">
            <thead>
              <tr>
                <Th>Finished</Th>
                <Th>Opponent</Th>
                <Th>Result</Th>
                <Th align="right" hide="sm">
                  Their rating
                </Th>
                <Th align="right">Change</Th>
                <Th align="right" hide="sm">
                  Yours after
                </Th>
              </tr>
            </thead>
            <tbody>
              {finished.map((m) => {
                const iAmPlayer1 = m.player1_id === user.id
                const opponent = iAmPlayer1 ? m.player2 : m.player1
                const completed = m.status === 'completed' && m.winner_id != null
                const won = completed && m.winner_id === user.id
                const myBefore = iAmPlayer1 ? m.player1_elo_before : m.player2_elo_before
                const myAfter = iAmPlayer1 ? m.player1_elo_after : m.player2_elo_after
                const theirBefore = iAmPlayer1 ? m.player2_elo_before : m.player1_elo_before
                const change = completed && myAfter != null && myBefore != null ? myAfter - myBefore : null
                const result = completed
                  ? won
                    ? 'Won'
                    : 'Lost'
                  : m.status === 'disputed'
                    ? 'Disputed'
                    : m.status === 'cancelled'
                      ? 'Cancelled'
                      : 'Expired'
                return (
                  <Tr key={m.id}>
                    <Td className="tabular text-xs text-mute">{formatDate(m.completed_at || m.created_at)}</Td>
                    <Td>
                      <Link href={`/matches/${m.id}`} className="inline-flex min-h-[44px] items-center text-[15px] text-white hover:underline">
                        {opponent?.display_name ?? 'Unknown player'}
                      </Link>
                    </Td>
                    <Td className={won ? 'text-white' : result === 'Lost' ? 'text-zinc-400' : result === 'Disputed' ? 'text-loss' : 'text-mute'}>{result}</Td>
                    <Td numeric hide="sm" className="text-zinc-400">
                      {theirBefore ?? '—'}
                    </Td>
                    <Td numeric className={change == null || change === 0 ? 'text-mute' : change > 0 ? 'text-win' : 'text-loss'}>
                      {change == null ? '—' : signed(change)}
                    </Td>
                    <Td numeric hide="sm" className={completed ? 'text-white' : 'text-mute'}>
                      {(completed ? myAfter : myBefore) ?? '—'}
                    </Td>
                  </Tr>
                )
              })}
            </tbody>
          </Table>
          <p className="mt-4 border-t border-line-strong pt-3.5 text-[13px] text-mute">
            {all.length >= LIMIT ? (
              <>
                Showing your latest <span className="tabular">{LIMIT}</span> matches.
              </>
            ) : (
              <>
                <span className="tabular">{finished.length}</span> finished {finished.length === 1 ? 'match' : 'matches'}.
              </>
            )}
          </p>
        </>
      )}
    </AppShell>
  )
}
