'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'
import Banner from '@/components/ui/Banner'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import GameIcon, { gameLabel } from '@/components/ui/GameIcon'
import MoneyDelta from '@/components/ui/MoneyDelta'
import TimeAgo from '@/components/ui/TimeAgo'
import { formatCents, ordinal } from '@/lib/poker/money'
import { sessionTitle } from '@/lib/poker/stats'
import type { InboxItem } from '@/lib/inbox'

interface InboxClientProps {
  items: InboxItem[]
  currentUserId: string
}

type Confirming =
  | { itemId: string; action: 'accept' }
  | { itemId: string; action: 'decline' }
  | { itemId: string; action: 'report'; winnerId: string }
  | { itemId: string; action: 'poker_dispute' }

export default function InboxClient({ items: initialItems, currentUserId }: InboxClientProps) {
  const [items, setItems] = useState(initialItems)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState<{ text: string; href?: string; label?: string } | null>(null)
  const [confirming, setConfirming] = useState<Confirming | null>(null)
  const [reason, setReason] = useState('')
  const router = useRouter()

  const removeItem = (itemId: string) => setItems((prev) => prev.filter((i) => i.id !== itemId))

  const callApi = async (
    itemId: string,
    endpoint: string,
    body: Record<string, string>,
    successText: (data: any) => string,
    link?: { href: string; label: string }
  ) => {
    setLoading(itemId)
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
      removeItem(itemId)
      setNotice({ text: successText(data), ...link })
      setReason('')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(null)
      setConfirming(null)
    }
  }

  const confirmStrip = (text: string, onConfirm: () => void, busy: boolean, variant: 'danger' | 'success' = 'success', extra?: React.ReactNode) => (
    <div className="mt-3 rounded-xl border border-line bg-ink-700 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-1 text-sm text-zinc-300">{text}</p>
        {!extra && (
          <>
            <Button size="sm" variant={variant} disabled={busy} onClick={onConfirm}>
              {busy ? 'Working…' : 'Confirm'}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirming(null)}>
              Back
            </Button>
          </>
        )}
      </div>
      {extra && (
        <>
          {extra}
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant={variant} disabled={busy} onClick={onConfirm}>
              {busy ? 'Working…' : 'Confirm'}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirming(null)}>
              Back
            </Button>
          </div>
        </>
      )}
    </div>
  )

  return (
    <div className="space-y-4">
      {error && <Banner tone="error">{error}</Banner>}
      {notice && (
        <Banner tone="success">
          {notice.text}
          {notice.href && (
            <>
              {' '}
              <Link href={notice.href} className="font-semibold underline hover:text-win">
                {notice.label}
              </Link>
            </>
          )}
        </Banner>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon="📭"
          title="You're all caught up"
          description="No challenges, results or ledgers waiting on you."
          action={<Button href="/matches/new">Challenge someone</Button>}
        />
      ) : (
        items.map((item) => {
          const busy = loading === item.id
          const isConfirmingThis = confirming?.itemId === item.id

          // ---------------- Match items (unchanged behaviour) ----------------
          if (item.kind === 'match') {
            const { match, action } = item
            const opponent = match.player1_id === currentUserId ? match.player2 : match.player1
            const isAcceptStart = action === 'accept_start'
            const runConfirmed = () => {
              if (!confirming) return
              if (confirming.action === 'accept') {
                callApi(item.id, '/api/matches/accept-start', { match_id: match.id }, () => 'Challenge accepted — good luck! Report the result here when you finish.', { href: `/matches/${match.id}`, label: 'View match' })
              } else if (confirming.action === 'decline') {
                callApi(item.id, '/api/matches/decline', { match_id: match.id }, () => 'Challenge declined.')
              } else if (confirming.action === 'report') {
                callApi(
                  item.id,
                  '/api/matches/accept-result',
                  { match_id: match.id, winner_id: confirming.winnerId },
                  (data) =>
                    data.match?.status === 'completed'
                      ? 'Match completed — ratings updated!'
                      : data.match?.status === 'disputed'
                        ? 'You and your opponent disagreed on the winner, so the match is disputed and no ratings changed.'
                        : 'Result submitted. Ratings update once your opponent confirms.',
                  { href: `/matches/${match.id}`, label: 'View match' }
                )
              }
            }
            return (
              <div key={item.id} className="card animate-fade-in p-5">
                <div className="flex items-start gap-4">
                  <Avatar src={opponent?.profile_image_url} name={opponent?.display_name ?? '?'} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white">
                      {isAcceptStart ? (
                        <>
                          <span className="font-semibold">{match.player1?.display_name}</span> challenged you to {gameLabel(match.game_type).toLowerCase()}
                        </>
                      ) : (
                        <>
                          Report the result of your {gameLabel(match.game_type).toLowerCase()} match with{' '}
                          <span className="font-semibold">{opponent?.display_name}</span>
                        </>
                      )}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                      <GameIcon game={match.game_type} className={cn('h-3.5 w-3.5', match.game_type === 'pool' ? 'text-pool' : 'text-pong')} />
                      <TimeAgo date={match.created_at} />
                      {' · '}
                      <Link href={`/matches/${match.id}`} className="underline hover:text-zinc-300">
                        details
                      </Link>
                    </p>
                    {!isConfirmingThis ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {isAcceptStart ? (
                          <>
                            <Button size="sm" variant="success" disabled={!!loading} onClick={() => setConfirming({ itemId: item.id, action: 'accept' })}>
                              Accept
                            </Button>
                            <Button size="sm" variant="danger" disabled={!!loading} onClick={() => setConfirming({ itemId: item.id, action: 'decline' })}>
                              Decline
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="success" disabled={!!loading} onClick={() => setConfirming({ itemId: item.id, action: 'report', winnerId: currentUserId })}>
                              I won
                            </Button>
                            <Button size="sm" variant="secondary" disabled={!!loading} onClick={() => setConfirming({ itemId: item.id, action: 'report', winnerId: opponent?.id ?? '' })}>
                              {opponent?.display_name} won
                            </Button>
                          </>
                        )}
                      </div>
                    ) : (
                      confirmStrip(
                        confirming.action === 'accept'
                          ? 'Accept and start this match?'
                          : confirming.action === 'decline'
                            ? 'Decline this challenge?'
                            : confirming.action === 'report'
                              ? `Report ${confirming.winnerId === currentUserId ? 'yourself' : opponent?.display_name} as the winner?`
                              : '',
                        runConfirmed,
                        busy,
                        confirming.action === 'decline' ? 'danger' : 'success'
                      )
                    )}
                  </div>
                </div>
              </div>
            )
          }

          // ---------------- Poker: confirm your line ----------------
          if (item.kind === 'poker_ack') {
            const { session, entry } = item
            const isTourney = session.kind === 'tournament'
            const title = sessionTitle(session)
            return (
              <div key={item.id} className="card animate-fade-in p-5">
                <div className="flex items-start gap-4">
                  <Avatar src={session.host?.profile_image_url} name={session.host?.display_name ?? '?'} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white">
                      <span className="font-semibold">{session.host?.display_name ?? 'Someone'}</span> logged{' '}
                      <span className="font-semibold">{title}</span> —{' '}
                      {isTourney ? (
                        <>
                          you {entry.finish_place != null ? `placed ${ordinal(entry.finish_place)} and ` : ''}cashed {formatCents(entry.cash_out_cents ?? 0, { compact: true })}{' '}
                          <MoneyDelta cents={entry.net_cents} chip compact />
                        </>
                      ) : (
                        <>
                          you finished <MoneyDelta cents={entry.net_cents} chip compact />
                          <span className="text-zinc-400"> (in {formatCents(entry.buy_in_cents, { compact: true })}, out {formatCents(entry.cash_out_cents ?? 0, { compact: true })})</span>
                        </>
                      )}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                      <GameIcon game="poker" className="h-3.5 w-3.5 text-poker" />
                      <TimeAgo date={item.sortAt} />
                      {' · '}
                      <Link href={`/poker/sessions/${session.id}`} className="underline hover:text-zinc-300">
                        full ledger
                      </Link>
                    </p>
                    {!isConfirmingThis ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="success"
                          disabled={!!loading}
                          onClick={() => callApi(item.id, '/api/poker/entries/acknowledge', { entry_id: entry.id }, () => 'Ledger confirmed.', { href: `/poker/sessions/${session.id}`, label: 'View session' })}
                        >
                          {busy ? 'Working…' : 'Looks right'}
                        </Button>
                        <Button size="sm" variant="danger" disabled={!!loading} onClick={() => setConfirming({ itemId: item.id, action: 'poker_dispute' })}>
                          Dispute
                        </Button>
                      </div>
                    ) : (
                      confirmStrip(
                        'What’s off? The host will see your note.',
                        () => callApi(item.id, '/api/poker/entries/dispute', { entry_id: entry.id, reason }, () => 'Dispute sent — the host has been notified.', { href: `/poker/sessions/${session.id}`, label: 'View session' }),
                        busy,
                        'danger',
                        <textarea className="input mt-2 min-h-[64px]" placeholder="e.g. I cashed out $60, not $40" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
                      )
                    )}
                  </div>
                </div>
              </div>
            )
          }

          // ---------------- Poker: someone disputed your ledger ----------------
          const { session, disputes } = item
          return (
            <div key={item.id} className="card animate-fade-in border-loss/20 p-5">
              <div className="flex items-start gap-4">
                <Avatar src={disputes[0]?.user?.profile_image_url} name={disputes[0]?.user?.display_name ?? '?'} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">
                    {disputes.length === 1 ? (
                      <>
                        <span className="font-semibold">{disputes[0].user?.display_name ?? 'A player'}</span> disputed your ledger for{' '}
                        <span className="font-semibold">{sessionTitle(session)}</span>
                      </>
                    ) : (
                      <>
                        <span className="font-semibold">{disputes.length} players</span> disputed your ledger for <span className="font-semibold">{sessionTitle(session)}</span>
                      </>
                    )}
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-zinc-300">
                    {disputes.map((d) => (
                      <li key={d.entry_id}>
                        <span className="text-zinc-500">{d.user?.display_name}:</span> “{d.reason}”
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                    <GameIcon game="poker" className="h-3.5 w-3.5 text-poker" />
                    <TimeAgo date={item.sortAt} />
                    {' · '}still counts until you edit or void it
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" href={`/poker/sessions/${session.id}/edit`}>
                      Edit ledger
                    </Button>
                    <Button size="sm" variant="secondary" href={`/poker/sessions/${session.id}`}>
                      View session
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
