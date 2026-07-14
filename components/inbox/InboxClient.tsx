'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import GameIcon, { gameLabel } from '@/components/ui/GameIcon'
import TimeAgo from '@/components/ui/TimeAgo'

type PendingMatch = {
  id: string
  game_type: string
  status: string
  player1_id: string
  player2_id: string
  player1: { id: string; display_name: string; profile_image_url: string | null }
  player2: { id: string; display_name: string; profile_image_url: string | null }
  created_at: string
}

type PendingItem = {
  match: PendingMatch
  action: 'accept_start' | 'report_result'
}

interface InboxClientProps {
  pendingItems: PendingItem[]
  currentUserId: string
}

type Confirming =
  | { matchId: string; action: 'accept' }
  | { matchId: string; action: 'decline' }
  | { matchId: string; action: 'report'; winnerId: string }

export default function InboxClient({ pendingItems: initialItems, currentUserId }: InboxClientProps) {
  const [pendingItems, setPendingItems] = useState(initialItems)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState<{ text: string; matchId?: string } | null>(null)
  const [confirming, setConfirming] = useState<Confirming | null>(null)
  const router = useRouter()

  const removeItem = (matchId: string) => {
    setPendingItems((prev) => prev.filter((i) => i.match.id !== matchId))
  }

  const callApi = async (
    matchId: string,
    endpoint: string,
    body: Record<string, string>,
    successText: (data: any) => string
  ) => {
    setLoading(matchId)
    setError('')
    setNotice(null)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      removeItem(matchId)
      setNotice({ text: successText(data), matchId })
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(null)
      setConfirming(null)
    }
  }

  const handleConfirmed = (item: PendingItem) => {
    if (!confirming) return
    const matchId = item.match.id
    if (confirming.action === 'accept') {
      callApi(matchId, '/api/matches/accept-start', { match_id: matchId }, () =>
        'Challenge accepted — good luck! Report the result here when you finish.'
      )
    } else if (confirming.action === 'decline') {
      callApi(matchId, '/api/matches/decline', { match_id: matchId }, () => 'Challenge declined.')
    } else {
      callApi(
        matchId,
        '/api/matches/accept-result',
        { match_id: matchId, winner_id: confirming.winnerId },
        (data) =>
          data.match?.status === 'completed'
            ? 'Match completed — ratings updated!'
            : data.match?.status === 'disputed'
              ? 'You and your opponent disagreed on the winner, so the match is disputed and no ratings changed.'
              : 'Result submitted. Ratings update once your opponent confirms.'
      )
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}
      {notice && (
        <div className="animate-fade-up rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4">
          <p className="text-sm text-emerald-300">
            {notice.text}
            {notice.matchId && (
              <>
                {' '}
                <Link href={`/matches/${notice.matchId}`} className="font-semibold underline hover:text-emerald-200">
                  View match
                </Link>
              </>
            )}
          </p>
        </div>
      )}

      {pendingItems.length === 0 ? (
        <EmptyState
          icon="📭"
          title="You're all caught up"
          description="No challenges or results waiting on you."
          action={<Button href="/matches/new">Challenge someone</Button>}
        />
      ) : (
        pendingItems.map((item) => {
          const { match, action } = item
          const isConfirmingThis = confirming?.matchId === match.id
          const busy = loading === match.id
          const opponent = match.player1_id === currentUserId ? match.player2 : match.player1
          const isAcceptStart = action === 'accept_start'

          return (
            <div key={match.id} className="card animate-fade-in p-5">
              <div className="flex items-start gap-4">
                <Avatar
                  src={opponent.profile_image_url}
                  name={opponent.display_name}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">
                    {isAcceptStart ? (
                      <>
                        <span className="font-semibold">{match.player1.display_name}</span> challenged
                        you to {gameLabel(match.game_type).toLowerCase()}
                      </>
                    ) : (
                      <>
                        Report the result of your {gameLabel(match.game_type).toLowerCase()} match
                        with <span className="font-semibold">{opponent.display_name}</span>
                      </>
                    )}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    <GameIcon
                      game={match.game_type}
                      className={cn('h-3.5 w-3.5', match.game_type === 'pool' ? 'text-pool' : 'text-pong')}
                    />
                    <TimeAgo date={match.created_at} />
                    {' · '}
                    <Link href={`/matches/${match.id}`} className="underline hover:text-slate-300">
                      details
                    </Link>
                  </p>

                  {/* Actions */}
                  {!isConfirmingThis ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {isAcceptStart ? (
                        <>
                          <Button
                            size="sm"
                            variant="success"
                            disabled={!!loading}
                            onClick={() => setConfirming({ matchId: match.id, action: 'accept' })}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={!!loading}
                            onClick={() => setConfirming({ matchId: match.id, action: 'decline' })}
                          >
                            Decline
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="success"
                            disabled={!!loading}
                            onClick={() =>
                              setConfirming({ matchId: match.id, action: 'report', winnerId: currentUserId })
                            }
                          >
                            I won
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={!!loading}
                            onClick={() =>
                              setConfirming({ matchId: match.id, action: 'report', winnerId: opponent.id })
                            }
                          >
                            {opponent.display_name} won
                          </Button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="mr-1 text-sm text-slate-300">
                        {confirming.action === 'accept' && 'Accept and start this match?'}
                        {confirming.action === 'decline' && 'Decline this challenge?'}
                        {confirming.action === 'report' &&
                          `Report ${
                            confirming.winnerId === currentUserId ? 'yourself' : opponent.display_name
                          } as the winner?`}
                      </p>
                      <Button
                        size="sm"
                        variant={confirming.action === 'decline' ? 'danger' : 'success'}
                        disabled={busy}
                        onClick={() => handleConfirmed(item)}
                      >
                        {busy ? 'Working…' : 'Confirm'}
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirming(null)}>
                        Back
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
