'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Banner from '@/components/ui/Banner'
import Button from '@/components/ui/Button'
import ConfirmStrip from '@/components/ui/ConfirmStrip'
import ExpiresIn from '@/components/match/ExpiresIn'
import { gameLabel } from '@/components/ui/GameIcon'
import MoneyDelta from '@/components/ui/MoneyDelta'
import TextLink from '@/components/ui/TextLink'
import TimeAgo from '@/components/ui/TimeAgo'
import { calculateElo } from '@/lib/elo'
import { formatCents, ordinal } from '@/lib/poker/money'
import { sessionTitle } from '@/lib/poker/stats'
import type { InboxItem } from '@/lib/inbox'

interface InboxClientProps {
  items: InboxItem[]
  currentUserId: string
  /** Current ratings, user id -> game -> rating. Falls back to the ratings stored on the match. */
  ratings?: Record<string, Record<string, number>>
}

type Confirming =
  | { itemId: string; action: 'accept' }
  | { itemId: string; action: 'decline' }
  | { itemId: string; action: 'report'; winnerId: string }
  | { itemId: string; action: 'poker_dispute' }

const signed = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n)}`
const firstName = (name: string | null | undefined) => (name ?? '').trim().split(/\s+/)[0] || 'they'

/** One ruled row of the queue: a type label, a sentence, a quiet line, and the actions */
function QueueRow({
  label,
  sentence,
  meta,
  actions,
  below,
}: {
  label: string
  sentence: React.ReactNode
  meta: React.ReactNode
  actions: React.ReactNode
  below?: React.ReactNode
}) {
  return (
    <article className="flex animate-fade-in flex-wrap items-center gap-x-5 gap-y-3 border-b border-line py-[18px]">
      <span className="w-[72px] shrink-0 text-xs text-mute">{label}</span>
      <div className="min-w-0 flex-[1_1_280px]">
        <p className="text-base text-white">{sentence}</p>
        <div className="mt-0.5 text-[13px] text-mute">{meta}</div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      {below && <div className="basis-full">{below}</div>}
    </article>
  )
}

/** The home queue: everything waiting on the viewer, each with its action in place */
export default function InboxClient({ items: initialItems, currentUserId, ratings = {} }: InboxClientProps) {
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

  return (
    <div>
      {(error || notice) && (
        <div className="mb-4 space-y-3">
          {error && <Banner tone="error">{error}</Banner>}
          {notice && (
            <Banner tone="success">
              {notice.text}
              {notice.href && (
                <>
                  {' '}
                  <Link href={notice.href} className="underline underline-offset-4">
                    {notice.label}
                  </Link>
                </>
              )}
            </Banner>
          )}
        </div>
      )}

      <section aria-label="Your move" className="border-t border-line-bright">
        {items.length === 0 ? (
          <p className="border-b border-line py-[18px] text-[15px] text-zinc-400">
            Challenges, results and ledgers land here.{' '}
            <TextLink href="/play" className="text-[15px]">
              Start something
            </TextLink>
          </p>
        ) : (
          items.map((item) => {
            const busy = loading === item.id
            const isConfirmingThis = confirming?.itemId === item.id

            if (item.kind === 'match') {
              const { match, action } = item
              const iAmPlayer1 = match.player1_id === currentUserId
              const opponent = iAmPlayer1 ? match.player2 : match.player1
              const opponentId = iAmPlayer1 ? match.player2_id : match.player1_id
              const isAcceptStart = action === 'accept_start'
              const game = gameLabel(match.game_type).toLowerCase()

              const myRating = ratings[currentUserId]?.[match.game_type] ?? (iAmPlayer1 ? match.player1_elo_before : match.player2_elo_before) ?? 1500
              const theirRating = ratings[opponentId]?.[match.game_type] ?? (iAmPlayer1 ? match.player2_elo_before : match.player1_elo_before) ?? 1500
              const ifWon = calculateElo(myRating, theirRating, 1).ratingChange1
              const ifLost = calculateElo(myRating, theirRating, 2).ratingChange1

              const runConfirmed = () => {
                if (!confirming) return
                if (confirming.action === 'accept') {
                  callApi(item.id, '/api/matches/accept-start', { match_id: match.id }, () => 'Challenge accepted. Report the result here when you finish.', { href: `/matches/${match.id}`, label: 'View match' })
                } else if (confirming.action === 'decline') {
                  callApi(item.id, '/api/matches/decline', { match_id: match.id }, () => 'Challenge declined.')
                } else if (confirming.action === 'report') {
                  callApi(
                    item.id,
                    '/api/matches/accept-result',
                    { match_id: match.id, winner_id: confirming.winnerId },
                    (data) =>
                      data.match?.status === 'completed'
                        ? 'Match completed. Ratings updated.'
                        : data.match?.status === 'disputed'
                          ? 'You and your opponent disagreed on the winner, so the match is disputed and no ratings changed.'
                          : 'Result submitted. Ratings update once your opponent confirms.',
                    { href: `/matches/${match.id}`, label: 'View match' }
                  )
                }
              }

              return (
                <QueueRow
                  key={item.id}
                  label={isAcceptStart ? 'Challenge' : 'Result'}
                  sentence={
                    isAcceptStart
                      ? `${match.player1?.display_name ?? 'Someone'} wants a game of ${game}`
                      : `Who won your ${game} match with ${opponent?.display_name ?? 'your opponent'}?`
                  }
                  meta={
                    <p>
                      {isAcceptStart ? (
                        <>
                          Sent <TimeAgo date={match.created_at} /> · <ExpiresIn createdAt={match.created_at} /> · <span className="tabular">{signed(ifWon)}</span> if you win,{' '}
                          <span className="tabular">{signed(ifLost)}</span> if you lose
                        </>
                      ) : (
                        <>
                          Started <TimeAgo date={match.started_at ?? match.created_at} /> · <span className="tabular">{signed(ifWon)}</span> if you won,{' '}
                          <span className="tabular">{signed(ifLost)}</span> if {firstName(opponent?.display_name)} did
                        </>
                      )}
                      {' · '}
                      <TextLink href={`/matches/${match.id}`} muted className="text-[13px]">
                        details
                      </TextLink>
                    </p>
                  }
                  actions={
                    !isConfirmingThis &&
                    (isAcceptStart ? (
                      <>
                        <Button disabled={!!loading} onClick={() => setConfirming({ itemId: item.id, action: 'accept' })} type="button">
                          Accept
                        </Button>
                        <Button variant="secondary" disabled={!!loading} onClick={() => setConfirming({ itemId: item.id, action: 'decline' })} type="button">
                          Decline
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="secondary" disabled={!!loading} onClick={() => setConfirming({ itemId: item.id, action: 'report', winnerId: currentUserId })} type="button">
                          I won
                        </Button>
                        <Button variant="secondary" disabled={!!loading} onClick={() => setConfirming({ itemId: item.id, action: 'report', winnerId: opponent?.id ?? '' })} type="button">
                          {firstName(opponent?.display_name)} won
                        </Button>
                      </>
                    ))
                  }
                  below={
                    isConfirmingThis && (
                      <ConfirmStrip
                        inline
                        className="mt-0"
                        busy={busy}
                        tone={confirming.action === 'decline' ? 'danger' : 'primary'}
                        onConfirm={runConfirmed}
                        onBack={() => setConfirming(null)}
                        text={
                          confirming.action === 'accept'
                            ? 'Accept and start this match?'
                            : confirming.action === 'decline'
                              ? 'Decline this challenge?'
                              : confirming.action === 'report'
                                ? `Report ${confirming.winnerId === currentUserId ? 'yourself' : opponent?.display_name} as the winner?`
                                : ''
                        }
                      />
                    )
                  }
                />
              )
            }

            if (item.kind === 'poker_ack') {
              const { session, entry } = item
              const isTourney = session.kind === 'tournament'
              const host = session.host?.display_name ?? 'Someone'
              return (
                <QueueRow
                  key={item.id}
                  label="Ledger"
                  sentence={
                    <>
                      {host} logged you {isTourney && entry.finish_place != null ? `in ${ordinal(entry.finish_place)} place ` : ''}at{' '}
                      <MoneyDelta cents={entry.net_cents} size="md" compact />
                    </>
                  }
                  meta={
                    <p>
                      {sessionTitle(session)} · <TimeAgo date={item.sortAt} /> ·{' '}
                      <span className="tabular">
                        in {formatCents(entry.buy_in_cents, { compact: true })}, out {formatCents(entry.cash_out_cents ?? 0, { compact: true })}
                      </span>
                      {' · '}
                      <TextLink href={`/poker/sessions/${session.id}`} muted className="text-[13px]">
                        see the table
                      </TextLink>
                    </p>
                  }
                  actions={
                    !isConfirmingThis && (
                      <>
                        <Button
                          variant="secondary"
                          disabled={!!loading}
                          type="button"
                          onClick={() => callApi(item.id, '/api/poker/entries/acknowledge', { entry_id: entry.id }, () => 'Ledger confirmed.', { href: `/poker/sessions/${session.id}`, label: 'View session' })}
                        >
                          {busy ? 'Working…' : 'Looks right'}
                        </Button>
                        <Button variant="ghost" disabled={!!loading} onClick={() => setConfirming({ itemId: item.id, action: 'poker_dispute' })} type="button">
                          Dispute
                        </Button>
                      </>
                    )
                  }
                  below={
                    isConfirmingThis && (
                      <ConfirmStrip
                        className="mt-0"
                        busy={busy}
                        tone="danger"
                        text="What is off? The host will see your note."
                        onBack={() => setConfirming(null)}
                        onConfirm={() =>
                          callApi(item.id, '/api/poker/entries/dispute', { entry_id: entry.id, reason }, () => 'Dispute sent. The host has been notified.', { href: `/poker/sessions/${session.id}`, label: 'View session' })
                        }
                      >
                        <textarea className="input min-h-[64px]" placeholder="e.g. I cashed out $60, not $40" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
                      </ConfirmStrip>
                    )
                  }
                />
              )
            }

            const { session, disputes } = item
            return (
              <QueueRow
                key={item.id}
                label="Dispute"
                sentence={
                  disputes.length === 1
                    ? `${disputes[0].user?.display_name ?? 'A player'} disputed your ledger for ${sessionTitle(session)}`
                    : `${disputes.length} players disputed your ledger for ${sessionTitle(session)}`
                }
                meta={
                  <>
                    <ul className="space-y-0.5 text-zinc-300">
                      {disputes.map((d) => (
                        <li key={d.entry_id}>
                          <span className="text-mute">{d.user?.display_name ?? 'A player'}:</span> “{d.reason}”
                        </li>
                      ))}
                    </ul>
                    <p className="mt-0.5">
                      <TimeAgo date={item.sortAt} /> · still counts until you edit or void it
                    </p>
                  </>
                }
                actions={
                  <>
                    <Button variant="secondary" href={`/poker/sessions/${session.id}/edit`}>
                      Edit ledger
                    </Button>
                    <Button variant="ghost" href={`/poker/sessions/${session.id}`}>
                      View session
                    </Button>
                  </>
                }
              />
            )
          })
        )}
      </section>
    </div>
  )
}
