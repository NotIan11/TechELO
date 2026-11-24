'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate, formatDateTime, isChallengeExpired } from '@/lib/utils'
import { calculateElo } from '@/lib/elo'
import { headToHead, ratingChangeFor, type CompletedMatchLike } from '@/lib/stats'
import Banner from '@/components/ui/Banner'
import Button from '@/components/ui/Button'
import ConfirmStrip from '@/components/ui/ConfirmStrip'
import EloDelta from '@/components/ui/EloDelta'
import PageIntro from '@/components/ui/PageIntro'
import SectionHeader from '@/components/ui/SectionHeader'
import TextLink from '@/components/ui/TextLink'

export type HeadToHeadMatch = CompletedMatchLike & { id: string }

interface MatchDetailsProps {
  match: any
  currentUserId: string
  /** Current ratings in this game, user id -> rating. Falls back to the ratings stored on the match. */
  ratings?: Record<string, number>
  /** Completed matches between these two players in this game, most recent first */
  history?: HeadToHeadMatch[]
}

type PendingAction = { type: 'accept' } | { type: 'decline' } | { type: 'cancel' }

type StepState = 'done' | 'current' | 'todo'

const signed = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n)}`
const firstName = (name: string | null | undefined) => (name ?? '').trim().split(/\s+/)[0] || 'Player'

/** Timestamps render in the reader's time zone, so the server's guess is allowed to differ */
function When({ date, dateOnly }: { date: string; dateOnly?: boolean }) {
  return (
    <time dateTime={date} suppressHydrationWarning>
      {dateOnly ? formatDate(date) : formatDateTime(date)}
    </time>
  )
}

export default function MatchDetails({ match: initialMatch, currentUserId, ratings = {}, history = [] }: MatchDetailsProps) {
  const [match, setMatch] = useState(initialMatch)
  const [confirming, setConfirming] = useState<PendingAction | null>(null)
  const [pick, setPick] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const isPlayer1 = match.player1_id === currentUserId
  const isPlayer2 = match.player2_id === currentUserId
  const isParticipant = isPlayer1 || isPlayer2
  const opponent = isPlayer1 ? match.player2 : match.player1

  // Live updates: merge the raw row into local state — payload.new does NOT
  // include the joined player1/player2 objects, so never replace wholesale.
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`match:${match.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${match.id}` },
        (payload) => {
          setMatch((prev: any) => ({ ...prev, ...(payload.new as any) }))
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.id])

  const callApi = async (endpoint: string, body: Record<string, string>) => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      if (data.match) setMatch((prev: any) => ({ ...prev, ...data.match }))
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setBusy(false)
      setConfirming(null)
    }
  }

  const runConfirmed = () => {
    if (!confirming) return
    if (confirming.type === 'accept') callApi('/api/matches/accept-start', { match_id: match.id })
    else if (confirming.type === 'decline') callApi('/api/matches/decline', { match_id: match.id })
    else callApi('/api/matches/cancel', { match_id: match.id })
  }

  const expired =
    match.status === 'challenge_expired' ||
    (match.status === 'pending_start' && isChallengeExpired(match.created_at))
  const completed = match.status === 'completed' && match.winner_id != null
  const disputed = match.status === 'disputed'
  const cancelled = match.status === 'cancelled'
  const awaitingAccept = match.status === 'pending_start' && !expired
  const underway = match.status === 'in_progress' || match.status === 'pending_result'

  const iReported = isPlayer1 ? match.player1_result_accepted : match.player2_result_accepted
  const canReport = isParticipant && !iReported && underway
  const challengedMe = awaitingAccept && isPlayer2 && !match.player2_start_accepted

  const game = match.game_type === 'ping_pong' ? 'ping pong' : 'pool'
  const gameName = match.game_type === 'ping_pong' ? 'Ping pong' : 'Pool'
  const p1 = match.player1
  const p2 = match.player2
  const first1 = firstName(p1?.display_name)
  const first2 = firstName(p2?.display_name)
  const opponentFirst = firstName(opponent?.display_name)
  const rating1: number = ratings[match.player1_id] ?? match.player1_elo_before ?? 1500
  const rating2: number = ratings[match.player2_id] ?? match.player2_elo_before ?? 1500

  const confirmLabel =
    confirming?.type === 'accept'
      ? 'Accept this challenge and start the match?'
      : confirming?.type === 'decline'
        ? 'Decline this challenge?'
        : confirming?.type === 'cancel'
          ? 'Withdraw this challenge?'
          : ''

  const strip = (tone: 'primary' | 'danger' | 'neutral') => (
    <ConfirmStrip className="mt-0" text={confirmLabel} onConfirm={runConfirmed} onBack={() => setConfirming(null)} busy={busy} tone={tone} inline />
  )

  // ---- The opening: what state this match is in, in words ----
  let title: string
  let lede: React.ReactNode
  if (canReport) {
    const theyReported = isPlayer1 ? match.player2_result_accepted : match.player1_result_accepted
    title = 'Who won?'
    lede = theyReported
      ? `${opponentFirst} has already reported. Ratings move if you report the same result.`
      : `Pick the winner. Ratings move when ${opponentFirst} reports the same result.`
  } else if (challengedMe) {
    title = `${first1} wants a game of ${game}.`
    lede = 'Challenges expire an hour after they are sent.'
  } else if (awaitingAccept) {
    title = isPlayer1 ? `Waiting for ${first2} to accept.` : `${first1} has challenged ${first2}.`
    lede = isPlayer1 ? 'They have been notified. The challenge expires an hour after it was sent.' : 'Waiting for the challenge to be accepted.'
  } else if (underway) {
    title = isParticipant ? 'Your result is in.' : `${first1} against ${first2}.`
    lede = isParticipant
      ? `Waiting for ${opponentFirst} to confirm. Ratings update once you both agree.`
      : 'Both players report the result. Ratings update when they agree.'
  } else if (completed) {
    const winner = match.winner_id === match.player1_id ? p1 : p2
    const loser = match.winner_id === match.player1_id ? p2 : p1
    title = winner?.id === currentUserId ? 'You won.' : `${firstName(winner?.display_name)} won.`
    lede = `${winner?.id === currentUserId ? 'You' : winner?.display_name} beat ${loser?.id === currentUserId ? 'you' : loser?.display_name} at ${game}, and both players confirmed it.`
  } else if (disputed) {
    title = 'The results did not match.'
    lede = isParticipant
      ? 'You and your opponent reported different winners, so no ratings changed. Settle it with a rematch.'
      : 'The two players reported different winners, so no ratings changed.'
  } else if (expired) {
    title = 'This challenge expired.'
    lede = 'It was not accepted within the hour. Send a new one when you are both around.'
  } else if (cancelled) {
    title = 'This challenge was called off.'
    lede = 'It was declined or withdrawn before the match started.'
  } else {
    title = `${gameName} match`
    lede = null
  }

  // ---- One half of the scoreboard ----
  const half = (seat: 1 | 2) => {
    const player = seat === 1 ? p1 : p2
    const other = seat === 1 ? p2 : p1
    const isMe = player?.id === currentUserId
    const current = seat === 1 ? rating1 : rating2
    const ifWon = calculateElo(rating1, rating2, seat)
    const ifLost = calculateElo(rating1, rating2, seat === 1 ? 2 : 1)
    const winChange = seat === 1 ? ifWon.ratingChange1 : ifWon.ratingChange2
    const winRating = seat === 1 ? ifWon.newRating1 : ifWon.newRating2
    const otherAfter = seat === 1 ? ifWon.newRating2 : ifWon.newRating1
    const otherDrop = Math.abs(seat === 1 ? ifWon.ratingChange2 : ifWon.ratingChange1)
    const loseChange = seat === 1 ? ifLost.ratingChange1 : ifLost.ratingChange2

    const before: number | null = seat === 1 ? match.player1_elo_before : match.player2_elo_before
    const after: number | null = seat === 1 ? match.player1_elo_after : match.player2_elo_after
    const isWinner = completed && match.winner_id === player?.id
    const selected = canReport && pick === player?.id
    const dimmed = (canReport && pick != null && !selected) || (completed && !isWinner)

    const body = (
      <>
        <span className="flex items-center justify-between gap-3 text-[13px] text-mute">
          <span>{isMe ? 'You' : seat === 1 ? 'Challenger' : 'Challenged'}</span>
          {selected && <span className="text-white">Selected</span>}
          {isWinner && <span className="text-orange-400">Winner</span>}
        </span>
        <span className={cn('mt-2.5 block font-display text-[28px] leading-tight tracking-tight sm:text-[32px]', dimmed ? 'text-zinc-400' : 'text-white')}>
          {player?.display_name}
        </span>
        <span className="tabular mt-7 flex items-baseline gap-3.5">
          {completed && before != null && after != null ? (
            <>
              <span className="text-[15px] text-mute">{before}</span>
              <span className={cn('text-[44px] leading-none tracking-tighter', dimmed ? 'text-zinc-400' : 'text-white')}>{after}</span>
              <EloDelta delta={after - before} className="text-[15px]" />
            </>
          ) : canReport ? (
            <>
              <span className="text-[15px] text-mute">{current}</span>
              <span className={cn('text-[44px] leading-none tracking-tighter', dimmed ? 'text-zinc-400' : 'text-white')}>{winRating}</span>
              <span className={cn('text-[15px]', selected ? 'text-win' : 'text-mute')}>{signed(winChange)}</span>
            </>
          ) : (
            <span className="text-[44px] leading-none tracking-tighter text-white">{completed ? (after ?? before ?? current) : current}</span>
          )}
        </span>
        {canReport ? (
          <span className="mt-2 block text-[13px] text-mute">
            {isMe
              ? `If you won, ${firstName(other?.display_name)} drops ${otherDrop} to ${otherAfter}.`
              : `If ${firstName(player?.display_name)} won, ${other?.id === currentUserId ? 'you drop' : `${firstName(other?.display_name)} drops`} ${otherDrop} to ${otherAfter}.`}
          </span>
        ) : awaitingAccept || underway ? (
          <span className="mt-2 block text-[13px] text-mute">
            <span className="tabular">{signed(winChange)}</span> with a win, <span className="tabular">{signed(loseChange)}</span> with a loss
          </span>
        ) : !completed ? (
          <span className="mt-2 block text-[13px] text-mute">No change to this rating.</span>
        ) : null}
      </>
    )

    const classes = cn('min-w-0 flex-1 p-6 text-left sm:p-8', seat === 2 && 'border-t border-line-strong sm:border-l sm:border-t-0')
    if (canReport) {
      return (
        <button
          type="button"
          aria-pressed={selected}
          disabled={busy}
          onClick={() => setPick(player.id)}
          className={cn(classes, 'transition', selected ? 'bg-white/[0.05] ring-1 ring-inset ring-white' : 'hover:bg-white/[0.03]')}
        >
          {body}
        </button>
      )
    }
    return <div className={classes}>{body}</div>
  }

  // ---- Progress: four steps, each with what actually happened ----
  const started = !!match.started_at || underway || completed || disputed
  const steps: { label: string; state: StepState; note: React.ReactNode }[] = [
    {
      label: 'Challenged',
      state: 'done',
      note: (
        <>
          <When date={match.created_at} /> · by {isPlayer1 ? 'you' : first1}
        </>
      ),
    },
    {
      label: 'Accepted',
      state: started ? 'done' : awaitingAccept ? 'current' : 'todo',
      note: started ? (
        <>
          {match.started_at && (
            <>
              <When date={match.started_at} /> ·{' '}
            </>
          )}
          by {isPlayer2 ? 'you' : first2}
        </>
      ) : awaitingAccept ? (
        `waiting on ${isPlayer2 ? 'you' : first2}`
      ) : expired ? (
        'expired unanswered'
      ) : (
        'declined or withdrawn'
      ),
    },
    {
      label: 'Report the result',
      state: completed || disputed ? 'done' : underway ? 'current' : 'todo',
      note: completed
        ? 'both reported the same winner'
        : disputed
          ? 'the two reports disagreed'
          : underway
            ? `${isPlayer1 ? 'You' : first1} ${match.player1_result_accepted ? (isPlayer1 ? 'have reported' : 'has reported') : isPlayer1 ? 'have not' : 'has not'} · ${isPlayer2 ? 'you' : first2} ${
                match.player2_result_accepted ? (isPlayer2 ? 'have reported' : 'has reported') : isPlayer2 ? 'have not' : 'has not'
              }`
            : 'once the match is played',
    },
    {
      label: 'Ratings update',
      state: completed ? 'done' : 'todo',
      note: completed ? match.completed_at ? <When date={match.completed_at} /> : 'done' : disputed ? 'no change' : started ? 'when you both agree' : 'after both reports agree',
    },
  ]

  // ---- Head-to-head in this game ----
  const record = headToHead(history, match.player1_id, match.player2_id)
  const myWins = isPlayer1 ? record.aWins : record.bWins
  const theirWins = isPlayer1 ? record.bWins : record.aWins
  const recordText = isParticipant
    ? myWins > theirWins
      ? { lead: 'You lead', score: `${myWins}–${theirWins}` }
      : theirWins > myWins
        ? { lead: `${opponentFirst} leads`, score: `${theirWins}–${myWins}` }
        : { lead: 'Level at', score: `${myWins}–${theirWins}` }
    : record.aWins > record.bWins
      ? { lead: `${first1} leads`, score: `${record.aWins}–${record.bWins}` }
      : record.bWins > record.aWins
        ? { lead: `${first2} leads`, score: `${record.bWins}–${record.aWins}` }
        : { lead: 'Level at', score: `${record.aWins}–${record.bWins}` }

  const rematchHref = `/play?opponent=${opponent?.id}&game_type=${match.game_type}`

  return (
    <div>
      <PageIntro
        kicker={
          <>
            <Link href={`/leaderboard?game_type=${match.game_type}`} className="underline-offset-4 hover:text-white hover:underline">
              {gameName}
            </Link>
            <span>
              · {match.started_at ? 'match started' : 'challenge sent'} <When date={match.started_at ?? match.created_at} />
            </span>
          </>
        }
        title={title}
        lede={lede}
      />

      {error && (
        <Banner tone="error" className="mt-6">
          {error}
        </Banner>
      )}

      <div role={canReport ? 'group' : undefined} aria-label={canReport ? 'Pick the winner' : undefined} className="mt-9 flex flex-col rounded border border-line-bright sm:flex-row">
        {half(1)}
        {half(2)}
      </div>

      {canReport && (
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <Button
            size="lg"
            type="button"
            disabled={busy || !pick}
            onClick={() => pick && callApi('/api/matches/accept-result', { match_id: match.id, winner_id: pick })}
          >
            {busy ? 'Reporting…' : !pick ? 'Pick the winner above' : pick === currentUserId ? 'Report that I won' : `Report that ${opponentFirst} won`}
          </Button>
          <span className="text-[13px] text-mute">Both players report. If the two reports disagree, the match is disputed and no ratings change.</span>
        </div>
      )}

      {challengedMe && (
        <div className="mt-5">
          {confirming ? (
            strip(confirming.type === 'decline' ? 'danger' : 'primary')
          ) : (
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={() => setConfirming({ type: 'accept' })} type="button">
                Accept challenge
              </Button>
              <Button size="lg" variant="secondary" onClick={() => setConfirming({ type: 'decline' })} type="button">
                Decline
              </Button>
            </div>
          )}
        </div>
      )}

      {awaitingAccept && isPlayer1 && (
        <div className="mt-5">
          {confirming?.type === 'cancel' ? (
            strip('danger')
          ) : (
            <Button variant="secondary" onClick={() => setConfirming({ type: 'cancel' })} type="button">
              Withdraw challenge
            </Button>
          )}
        </div>
      )}

      {isParticipant && (disputed || expired || cancelled || completed) && opponent?.id && (
        <p className="mt-5 text-sm text-zinc-400">
          <TextLink href={rematchHref} arrow="right">
            {completed || disputed ? `Challenge ${opponentFirst} to a rematch` : `Challenge ${opponentFirst} again`}
          </TextLink>
        </p>
      )}

      <ol className="mt-14 grid grid-cols-2 gap-y-6 sm:grid-cols-4">
        {steps.map((step) => (
          <li
            key={step.label}
            aria-current={step.state === 'current' ? 'step' : undefined}
            className={cn('border-t pr-4 pt-3.5', step.state === 'current' ? 'border-white' : step.state === 'done' ? 'border-line-bright' : 'border-line-strong')}
          >
            <span className={cn('block text-sm', step.state === 'current' ? 'text-white' : step.state === 'done' ? 'text-zinc-300' : 'text-mute')}>{step.label}</span>
            <span className="tabular mt-0.5 block text-xs text-mute">{step.note}</span>
          </li>
        ))}
      </ol>

      <section className="mt-14">
        <SectionHeader
          title={isParticipant ? `You and ${opponentFirst} at ${game}` : `${first1} and ${first2} at ${game}`}
          aside={
            history.length > 0 && (
              <span className="text-[13px] text-zinc-300">
                {recordText.lead} <span className="tabular">{recordText.score}</span>
              </span>
            )
          }
        />
        {history.length === 0 ? (
          <p className="border-b border-line py-3 text-sm text-mute">
            {isParticipant ? `You and ${opponentFirst} have not finished a ${game} match yet.` : `They have not finished a ${game} match against each other yet.`}
          </p>
        ) : (
          history.map((h) => {
            const iWon = h.winner_id === currentUserId
            const winnerFirst = h.winner_id === match.player1_id ? first1 : first2
            const change = isParticipant ? ratingChangeFor(h, currentUserId) : h.winner_id ? ratingChangeFor(h, h.winner_id) : null
            const isThis = h.id === match.id
            const row = (
              <>
                <span className="tabular w-[104px] shrink-0 text-xs text-mute">
                  <When date={h.completed_at ?? h.created_at} dateOnly />
                </span>
                <span className={cn('min-w-0 flex-1 text-sm', isParticipant && !iWon ? 'text-zinc-400' : 'text-white')}>
                  {isParticipant && iWon ? 'You won' : `${winnerFirst} won`}
                  {isThis && <span className="text-mute"> · this match</span>}
                </span>
                {change != null && <EloDelta delta={change} />}
              </>
            )
            return isThis ? (
              <div key={h.id} className="flex items-baseline gap-5 border-b border-line py-3">
                {row}
              </div>
            ) : (
              <Link key={h.id} href={`/matches/${h.id}`} className="flex items-baseline gap-5 border-b border-line py-3 transition hover:border-line-bright">
                {row}
              </Link>
            )
          })
        )}
      </section>
    </div>
  )
}
