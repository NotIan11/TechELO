'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDateTime, isChallengeExpired } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'
import Banner from '@/components/ui/Banner'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EloDelta from '@/components/ui/EloDelta'
import GameIcon, { gameLabel } from '@/components/ui/GameIcon'
import StatusBadge from '@/components/ui/StatusBadge'
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

  const playerPanel = (player: any, eloBefore: number, eloAfter: number | null, isWinner: boolean) => (
    <div
      className={cn(
        'flex flex-1 flex-col items-center rounded-2xl border p-6 text-center transition',
        isWinner
          ? 'border-warn/20 bg-amber-400/[0.05]'
          : 'border-white/[0.06] bg-ink-900'
      )}
    >
      {isWinner && (
        <span className="mb-2 text-xl" role="img" aria-label="Winner">
          👑
        </span>
      )}
      <Avatar src={player.profile_image_url} name={player.display_name} size="lg" />
      <p className="mt-3 font-display text-lg font-semibold text-white">
        {player.display_name}
        {player.id === currentUserId && <span className="ml-1.5 text-xs font-normal text-orange-400">you</span>}
      </p>
      <p className="tabular mt-1 text-sm text-zinc-400">
        {eloAfter != null ? (
          <>
            {eloBefore} → <span className="font-semibold text-white">{eloAfter}</span>{' '}
            <EloDelta delta={eloAfter - eloBefore} />
          </>
        ) : (
          <>
            Rating: <span className="font-semibold text-white">{eloBefore}</span>
          </>
        )}
      </p>
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'inline-flex h-10 w-10 items-center justify-center rounded-xl',
              match.game_type === 'pool' ? 'bg-sky-400/10 text-pool' : 'bg-win/10 text-pong'
            )}
          >
            <GameIcon game={match.game_type} className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-xl font-bold text-white">
              {gameLabel(match.game_type)} match
            </h1>
            <p className="text-xs text-zinc-500">
              Created <TimeAgo date={match.created_at} />
            </p>
          </div>
        </div>
        <StatusBadge status={displayStatus} />
      </div>

      {/* Head-to-head */}
      <Card>
        <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
          {playerPanel(
            match.player1,
            match.player1_elo_before,
            match.player1_elo_after,
            completed && match.winner_id === match.player1_id
          )}
          <div className="flex items-center justify-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-line bg-ink-700 font-display text-sm font-bold text-zinc-400">
              VS
            </span>
          </div>
          {playerPanel(
            match.player2,
            match.player2_elo_before,
            match.player2_elo_after,
            completed && match.winner_id === match.player2_id
          )}
        </div>
      </Card>

      {error && <Banner tone="error">{error}</Banner>}

      {/* State banners + actions */}
      {match.status === 'pending_start' && !expired && (
        <Card>
          {isPlayer2 && !match.player2_start_accepted ? (
            <>
              <p className="font-medium text-white">
                {match.player1.display_name} challenged you. Ready to play?
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                Challenges expire an hour after they're sent.
              </p>
              {confirming ? (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <p className="text-sm text-zinc-300">{confirmLabel}</p>
                  <Button
                    size="sm"
                    variant={confirming.type === 'decline' ? 'danger' : 'success'}
                    onClick={runConfirmed}
                    disabled={busy}
                  >
                    {busy ? 'Working…' : 'Confirm'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirming(null)} disabled={busy}>
                    Back
                  </Button>
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button variant="success" onClick={() => setConfirming({ type: 'accept' })}>
                    Accept challenge
                  </Button>
                  <Button variant="danger" onClick={() => setConfirming({ type: 'decline' })}>
                    Decline
                  </Button>
                </div>
              )}
            </>
          ) : isPlayer1 ? (
            <>
              <p className="font-medium text-white">
                Waiting for {match.player2.display_name} to accept…
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                They've been notified. The challenge expires an hour after it was sent.
              </p>
              {confirming?.type === 'cancel' ? (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <p className="text-sm text-zinc-300">{confirmLabel}</p>
                  <Button size="sm" variant="danger" onClick={runConfirmed} disabled={busy}>
                    {busy ? 'Working…' : 'Confirm'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirming(null)} disabled={busy}>
                    Back
                  </Button>
                </div>
              ) : (
                <div className="mt-4">
                  <Button variant="secondary" onClick={() => setConfirming({ type: 'cancel' })}>
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
          <p className="mt-1 text-sm text-zinc-400">
            Both players report the result — ratings update when you agree.
          </p>
          {confirming?.type === 'report' ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <p className="text-sm text-zinc-300">{confirmLabel}</p>
              <Button size="sm" variant="success" onClick={runConfirmed} disabled={busy}>
                {busy ? 'Submitting…' : 'Confirm'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirming(null)} disabled={busy}>
                Back
              </Button>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                variant="success"
                onClick={() => setConfirming({ type: 'report', winnerId: currentUserId })}
              >
                I won
              </Button>
              <Button
                variant="secondary"
                onClick={() => setConfirming({ type: 'report', winnerId: opponent.id })}
              >
                {opponent.display_name} won
              </Button>
            </div>
          )}
        </Card>
      )}

      {isParticipant && iReported && match.status === 'pending_result' && (
        <Card className="border-purple-400/20 bg-purple-400/[0.04]">
          <p className="text-sm text-purple-200">
            Your result is in. Waiting for {opponent.display_name} to confirm — ratings update once
            you both agree.
          </p>
        </Card>
      )}

      {match.status === 'disputed' && (
        <Card className="border-loss/20 bg-loss/5">
          <p className="text-sm text-loss">
            You and your opponent reported different winners, so no ratings changed. Settle it the
            honorable way: rematch.
          </p>
        </Card>
      )}

      {expired && (
        <Card className="border-white/[0.06]">
          <p className="text-sm text-zinc-400">
            This challenge expired before it was accepted. Send a new one when you're both around.
          </p>
        </Card>
      )}

      {match.status === 'cancelled' && (
        <Card className="border-white/[0.06]">
          <p className="text-sm text-zinc-400">This challenge was declined or withdrawn.</p>
        </Card>
      )}

      {/* Timeline */}
      <Card padding="sm">
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="eyebrow">Created</dt>
            <dd className="mt-0.5 text-zinc-300">{formatDateTime(match.created_at)}</dd>
          </div>
          <div>
            <dt className="eyebrow">Started</dt>
            <dd className="mt-0.5 text-zinc-300">
              {match.started_at ? formatDateTime(match.started_at) : '—'}
            </dd>
          </div>
          <div>
            <dt className="eyebrow">Completed</dt>
            <dd className="mt-0.5 text-zinc-300">
              {match.completed_at ? formatDateTime(match.completed_at) : '—'}
            </dd>
          </div>
        </dl>
      </Card>
    </div>
  )
}
