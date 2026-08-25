'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDateTime, isChallengeExpired } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'
import Banner from '@/components/ui/Banner'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import ConfirmStrip from '@/components/ui/ConfirmStrip'
import EloDelta from '@/components/ui/EloDelta'
import GameIcon, { gameLabel } from '@/components/ui/GameIcon'
import Icon from '@/components/ui/Icon'
import IconTile from '@/components/ui/IconTile'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import TextLink from '@/components/ui/TextLink'
import TimeAgo from '@/components/ui/TimeAgo'

interface MatchDetailsProps {
  match: any
  currentUserId: string
}

type PendingAction =
  | { type: 'accept' }
  | { type: 'decline' }
  | { type: 'cancel' }
  | { type: 'report'; winnerId: string }

export default function MatchDetails({ match: initialMatch, currentUserId }: MatchDetailsProps) {
  const [match, setMatch] = useState(initialMatch)
  const [confirming, setConfirming] = useState<PendingAction | null>(null)
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
    else if (confirming.type === 'cancel') callApi('/api/matches/cancel', { match_id: match.id })
    else callApi('/api/matches/accept-result', { match_id: match.id, winner_id: confirming.winnerId })
  }

  const expired =
    match.status === 'challenge_expired' ||
    (match.status === 'pending_start' && isChallengeExpired(match.created_at))
  const displayStatus = expired && match.status === 'pending_start' ? 'challenge_expired' : match.status
  const completed = match.status === 'completed' && match.winner_id != null

  const iReported = isPlayer1 ? match.player1_result_accepted : match.player2_result_accepted
  const canReport =
    isParticipant && !iReported && (match.status === 'in_progress' || match.status === 'pending_result')

  const confirmLabel =
    confirming?.type === 'accept'
      ? 'Accept this challenge and start the match?'
      : confirming?.type === 'decline'
        ? 'Decline this challenge?'
        : confirming?.type === 'cancel'
          ? 'Withdraw this challenge?'
          : confirming?.type === 'report'
            ? `Report ${confirming.winnerId === currentUserId ? 'yourself' : opponent?.display_name} as the winner?`
            : ''

  const strip = (tone: 'primary' | 'danger' | 'neutral') => (
    <ConfirmStrip text={confirmLabel} onConfirm={runConfirmed} onBack={() => setConfirming(null)} busy={busy} tone={tone} inline />
  )

  const playerPanel = (player: any, eloBefore: number, eloAfter: number | null, isWinner: boolean) => (
    <div
      className={cn(
        'flex flex-1 flex-col items-center rounded-2xl border p-6 text-center transition',
        isWinner ? 'border-orange-500/40 bg-orange-500/5' : 'border-line bg-ink-900'
      )}
    >
      {isWinner && <Icon name="crown" className="mb-2 h-5 w-5 text-orange-400" aria-label="Winner" />}
      <Avatar src={player.profile_image_url} name={player.display_name} size="lg" />
      <p className="mt-3 font-display text-lg font-semibold text-white">
        {player.display_name}
        {player.id === currentUserId && <span className="ml-1.5 text-xs font-normal text-orange-400">you</span>}
      </p>
      <p className="tabular mt-1 flex items-center gap-1.5 text-sm text-zinc-400">
        {eloAfter != null ? (
          <>
            {eloBefore} <Icon name="arrow-right" className="h-3 w-3" /> <span className="font-semibold text-white">{eloAfter}</span>{' '}
            <EloDelta delta={eloAfter - eloBefore} />
          </>
        ) : (
          <>
            Rating <span className="font-semibold text-white">{eloBefore}</span>
          </>
        )}
      </p>
    </div>
  )

  return (
    <div className="space-y-5">
      <PageHeader
        size="md"
        leading={<IconTile icon={<GameIcon game={match.game_type} />} />}
        title={`${gameLabel(match.game_type)} match`}
        meta={
          <>
            <TextLink href="/matches" muted className="text-xs">
              Matches
            </TextLink>
            <span>
              · created <TimeAgo date={match.created_at} />
            </span>
          </>
        }
        actions={<StatusBadge status={displayStatus} />}
      />

      <Card>
        <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
          {playerPanel(match.player1, match.player1_elo_before, match.player1_elo_after, completed && match.winner_id === match.player1_id)}
          <div className="flex items-center justify-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-line bg-ink-700 font-display text-sm font-bold text-zinc-400">
              VS
            </span>
          </div>
          {playerPanel(match.player2, match.player2_elo_before, match.player2_elo_after, completed && match.winner_id === match.player2_id)}
        </div>
      </Card>

      {completed && (
        <p className="text-[13px] text-zinc-400">
          Round two? Settle it at the poker table.{' '}
          <TextLink href="/poker/sessions/new" arrow="right" className="text-[13px]">
            Start a game
          </TextLink>
        </p>
      )}

      {error && <Banner tone="error">{error}</Banner>}

      {match.status === 'pending_start' && !expired && (
        <Card>
          {isPlayer2 && !match.player2_start_accepted ? (
            <>
              <p className="font-medium text-white">{match.player1.display_name} challenged you. Ready to play?</p>
              <p className="mt-1 text-sm text-zinc-400">Challenges expire an hour after they are sent.</p>
              {confirming ? (
                strip(confirming.type === 'decline' ? 'danger' : 'primary')
              ) : (
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button onClick={() => setConfirming({ type: 'accept' })} type="button">
                    Accept challenge
                  </Button>
                  <Button variant="danger" onClick={() => setConfirming({ type: 'decline' })} type="button">
                    Decline
                  </Button>
                </div>
              )}
            </>
          ) : isPlayer1 ? (
            <>
              <p className="font-medium text-white">Waiting for {match.player2.display_name} to accept</p>
              <p className="mt-1 text-sm text-zinc-400">They have been notified. The challenge expires an hour after it was sent.</p>
              {confirming?.type === 'cancel' ? (
                strip('danger')
              ) : (
                <div className="mt-4">
                  <Button variant="secondary" onClick={() => setConfirming({ type: 'cancel' })} type="button">
                    Withdraw challenge
                  </Button>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-zinc-400">Waiting for the challenge to be accepted.</p>
          )}
        </Card>
      )}

      {canReport && (
        <Card>
          <p className="font-medium text-white">Who won?</p>
          <p className="mt-1 text-sm text-zinc-400">Both players report the result. Ratings update when you agree.</p>
          {confirming?.type === 'report' ? (
            strip('primary')
          ) : (
            <div className="mt-4 flex flex-wrap gap-3">
              <Button onClick={() => setConfirming({ type: 'report', winnerId: currentUserId })} type="button">
                I won
              </Button>
              <Button variant="secondary" onClick={() => setConfirming({ type: 'report', winnerId: opponent.id })} type="button">
                {opponent.display_name} won
              </Button>
            </div>
          )}
        </Card>
      )}

      {isParticipant && iReported && match.status === 'pending_result' && (
        <Banner tone="info">Your result is in. Waiting for {opponent.display_name} to confirm. Ratings update once you both agree.</Banner>
      )}

      {match.status === 'disputed' && (
        <>
          <Banner tone="error">You and your opponent reported different winners, so no ratings changed. Settle it with a rematch.</Banner>
          <p className="text-[13px] text-zinc-400">
            You reported different winners. Poker has a ledger for exactly this.{' '}
            <TextLink href="/poker/sessions/new" arrow="right" className="text-[13px]">
              Log a session
            </TextLink>
          </p>
        </>
      )}

      {expired && (
        <Card padding="sm">
          <p className="text-sm text-zinc-400">This challenge expired before it was accepted. Send a new one when you are both around.</p>
        </Card>
      )}

      {match.status === 'cancelled' && (
        <Card padding="sm">
          <p className="text-sm text-zinc-400">This challenge was declined or withdrawn.</p>
        </Card>
      )}

      <Card padding="sm">
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="eyebrow">Created</dt>
            <dd className="mt-0.5 text-zinc-300">{formatDateTime(match.created_at)}</dd>
          </div>
          <div>
            <dt className="eyebrow">Started</dt>
            <dd className="mt-0.5 text-zinc-300">{match.started_at ? formatDateTime(match.started_at) : '—'}</dd>
          </div>
          <div>
            <dt className="eyebrow">Completed</dt>
            <dd className="mt-0.5 text-zinc-300">{match.completed_at ? formatDateTime(match.completed_at) : '—'}</dd>
          </div>
        </dl>
      </Card>
    </div>
  )
}
