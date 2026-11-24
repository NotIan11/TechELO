'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Banner from '@/components/ui/Banner'
import Button from '@/components/ui/Button'
import ConfirmStrip from '@/components/ui/ConfirmStrip'
import MoneyDelta from '@/components/ui/MoneyDelta'
import PageIntro, { Num } from '@/components/ui/PageIntro'
import TextLink from '@/components/ui/TextLink'
import LedgerTable from './LedgerTable'
import PlayerName from './PlayerName'
import ShareButton from './ShareButton'
import SponsorRow from './SponsorRow'
import { formatCents, formatDuration } from '@/lib/poker/money'
import { formatPokerDateTime } from '@/lib/poker/periods'
import { firstName, numberWord, plural } from '@/lib/poker/phrases'
import { ackSummary, binkOfTheNight, computeTotals, sessionTitle } from '@/lib/poker/stats'
import type { SessionFull } from '@/lib/poker/queries'

interface SessionDetailsProps {
  session: SessionFull
  currentUserId: string | null
}

type Confirming = 'void' | 'dispute' | 'withdraw' | null

export default function SessionDetails({ session, currentUserId }: SessionDetailsProps) {
  const router = useRouter()
  const [confirming, setConfirming] = useState<Confirming>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`poker-session:${session.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'poker_sessions', filter: `id=eq.${session.id}` }, () => router.refresh())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [session.id, router])

  const isHost = currentUserId != null && session.host_id === currentUserId
  const myEntry = currentUserId ? session.entries.find((e) => e.user_id === currentUserId) ?? null : null
  const isTourney = session.kind === 'tournament'
  const counts = session.status === 'final' || session.status === 'disputed'
  const acks = ackSummary(session.entries)
  const totals = computeTotals(session.entries, isTourney ? session.prize_pool_cents : null)
  const bink = session.status !== 'voided' ? binkOfTheNight(session.entries) : null
  const disputes = session.entries.filter((e) => e.disputed_at != null)
  const title = sessionTitle(session)

  const callApi = async (endpoint: string, body: Record<string, unknown>, successText: string) => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setNotice(successText)
      setReason('')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setBusy(false)
      setConfirming(null)
    }
  }

  const disputeBox = (
    <textarea
      className="input min-h-[72px]"
      placeholder="e.g. I cashed out $60, not $40"
      aria-label="What is off"
      value={reason}
      maxLength={500}
      onChange={(e) => setReason(e.target.value)}
    />
  )

  const kindLabel = isTourney ? (session.is_official ? 'Official tournament' : 'Tournament') : 'Cash game'
  const terms = isTourney
    ? session.standard_buy_in_cents != null
      ? session.standard_buy_in_cents === 0
        ? 'free entry'
        : `${formatCents(session.standard_buy_in_cents, { compact: true })} entry`
      : null
    : session.stakes
  const players = session.entries.length
  const moneyIn = isTourney && session.prize_pool_cents != null ? session.prize_pool_cents : totals.buyIn
  const binkName = bink?.user?.display_name ?? null
  const edited = session.finalized_at != null && new Date(session.updated_at).getTime() - new Date(session.finalized_at).getTime() > 60_000
  const guestEntries = session.entries.filter((e) => e.user_id == null)

  const myLine = myEntry ? (
    <p className="tabular mt-1.5 text-sm text-zinc-300">
      in {formatCents(myEntry.buy_in_cents)} · out {formatCents(myEntry.cash_out_cents ?? 0)} · <MoneyDelta cents={myEntry.net_cents} />
    </p>
  ) : null

  return (
    <div>
      <PageIntro
        className="sm:items-start"
        kicker={
          <>
            <TextLink href="/poker/sessions" muted>
              Poker sessions
            </TextLink>
            <span>· {kindLabel}</span>
            {terms && <span className="tabular">· {terms}</span>}
            {session.variant && <span>· {session.variant}</span>}
            <span className="tabular">· {formatPokerDateTime(session.played_at)}</span>
            {session.location && <span>· {session.location}</span>}
          </>
        }
        title={title}
        lede={
          session.status === 'voided' ? (
            <>This night was voided by the host. Nothing on it counts.</>
          ) : players === 0 ? (
            <>Nobody was on this ledger.</>
          ) : (
            <>
              {numberWord(players, true)} {plural(players, 'player')} put in <Num>{formatCents(moneyIn, { compact: true })}</Num>.
              {bink && binkName && (
                <>
                  {' '}
                  {bink.user_id != null && bink.user_id === currentUserId ? 'You' : binkName} took the night at{' '}
                  <Num tone="win">{formatCents(bink.net_cents, { sign: true, compact: true })}</Num>.
                </>
              )}
            </>
          )
        }
        actions={<ShareButton path={`/poker/sessions/${session.id}`} title={title} />}
      />

      {(notice || error) && (
        <div className="mt-6 space-y-2">
          {notice && <Banner tone="success">{notice}</Banner>}
          {error && <Banner tone="error">{error}</Banner>}
        </div>
      )}

      {/* The viewer's own line comes first */}
      {counts && myEntry && !isHost && (
        <section
          className={
            myEntry.disputed_at
              ? 'mt-9 rounded border border-loss/50 px-5 py-5 sm:px-6'
              : myEntry.acknowledged_at
                ? 'mt-9 rounded border border-line-strong px-5 py-5 sm:px-6'
                : 'mt-9 rounded border border-orange-500 px-5 py-5 sm:px-6'
          }
        >
          {myEntry.disputed_at ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-5">
                <div className="min-w-0">
                  <h2 className="font-display text-[22px] tracking-tight text-white">You disputed your line</h2>
                  {myLine}
                  <p className="mt-1.5 text-[13px] text-zinc-400">“{myEntry.dispute_reason}”</p>
                </div>
                {confirming !== 'withdraw' && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="lg" onClick={() => callApi('/api/poker/entries/acknowledge', { entry_id: myEntry.id }, 'Ledger confirmed.')} disabled={busy} type="button">
                      Actually, looks right
                    </Button>
                    <Button size="lg" variant="secondary" onClick={() => setConfirming('withdraw')} disabled={busy} type="button">
                      Withdraw dispute
                    </Button>
                  </div>
                )}
              </div>
              {confirming === 'withdraw' && (
                <ConfirmStrip
                  text="Withdraw your dispute?"
                  tone="neutral"
                  busy={busy}
                  onBack={() => setConfirming(null)}
                  onConfirm={() => callApi('/api/poker/entries/withdraw-dispute', { entry_id: myEntry.id }, 'Dispute withdrawn.')}
                  inline
                />
              )}
            </>
          ) : myEntry.acknowledged_at ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
                <div className="min-w-0">
                  <h2 className="font-display text-[22px] tracking-tight text-white">You confirmed your line</h2>
                  {myLine}
                </div>
                {confirming !== 'dispute' && (
                  <TextLink muted onClick={() => setConfirming('dispute')} className="min-h-[44px] text-[13px]">
                    Something wrong? Dispute it
                  </TextLink>
                )}
              </div>
              {confirming === 'dispute' && (
                <ConfirmStrip
                  text="Something wrong? Tell the host what is off."
                  tone="danger"
                  confirmLabel="Send dispute"
                  busy={busy}
                  onBack={() => setConfirming(null)}
                  onConfirm={() => callApi('/api/poker/entries/dispute', { entry_id: myEntry.id, reason }, 'Dispute sent. The host has been notified.')}
                >
                  {disputeBox}
                </ConfirmStrip>
              )}
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-5">
                <div className="min-w-0">
                  <h2 className="font-display text-[22px] tracking-tight text-white">Is your line right?</h2>
                  {myLine}
                  <p className="mt-1.5 text-[13px] text-mute">The night already counts. Confirming is what marks it verified.</p>
                </div>
                {confirming !== 'dispute' && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="lg" onClick={() => callApi('/api/poker/entries/acknowledge', { entry_id: myEntry.id }, 'Ledger confirmed.')} disabled={busy} type="button">
                      Looks right
                    </Button>
                    <Button size="lg" variant="secondary" onClick={() => setConfirming('dispute')} disabled={busy} type="button">
                      Something is off
                    </Button>
                  </div>
                )}
              </div>
              {confirming === 'dispute' && (
                <ConfirmStrip
                  text="What is off? The host will see your note."
                  tone="danger"
                  confirmLabel="Send dispute"
                  busy={busy}
                  onBack={() => setConfirming(null)}
                  onConfirm={() => callApi('/api/poker/entries/dispute', { entry_id: myEntry.id, reason }, 'Dispute sent. The host has been notified.')}
                >
                  {disputeBox}
                </ConfirmStrip>
              )}
            </>
          )}
        </section>
      )}

      {(session.status === 'voided' || session.status === 'disputed' || (counts && totals.discrepancy !== 0)) && (
        <div className="mt-6 space-y-2">
          {session.status === 'voided' && <Banner tone="info">This session was voided by the host and does not count toward anything.</Banner>}
          {session.status === 'disputed' && (
            <Banner tone="error">
              <p>Disputed</p>
              <ul className="mt-1 space-y-1 text-zinc-200">
                {disputes.map((d) => (
                  <li key={d.id}>
                    {d.user?.display_name ?? 'Someone'}: “{d.dispute_reason}”
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-zinc-400">
                The session still counts. {isHost ? 'Edit the session to resolve it. Saving asks everyone to confirm again.' : 'The host has been notified.'}
              </p>
            </Banner>
          )}
          {counts && totals.discrepancy !== 0 && (
            <Banner tone="warning">
              {isTourney
                ? `Payouts (${formatCents(totals.cashOut, { compact: true })}) do not match the ${session.prize_pool_cents != null ? 'prize pool' : 'entries'} (${formatCents(session.prize_pool_cents ?? totals.buyIn, { compact: true })}). Off by ${formatCents(Math.abs(totals.discrepancy), { compact: true })}.`
                : `Buy-ins ${formatCents(totals.buyIn, { compact: true })} vs cash-outs ${formatCents(totals.cashOut, { compact: true })}. The table is off by ${formatCents(Math.abs(totals.discrepancy), { compact: true })}.`}
            </Banner>
          )}
        </div>
      )}

      {session.is_official && session.sponsors.length > 0 && <SponsorRow sponsors={session.sponsors} className="mt-8" />}

      <div className="mt-10">
        <LedgerTable
          kind={session.kind}
          entries={session.entries}
          currentUserId={currentUserId}
          hostId={session.host_id}
          totals={totals}
          prizePoolCents={isTourney ? session.prize_pool_cents : null}
          showAcks={counts}
        />
      </div>

      <dl className="mt-10 grid grid-cols-2 gap-6 border-t border-line-strong pt-5 sm:grid-cols-4">
        <div>
          <dt className="text-xs text-mute">Host</dt>
          <dd className="mt-1">
            <PlayerName player={session.host ? { ...session.host, dorm_name: null } : null} className="[&>span:first-child]:text-sm" />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-mute">Lasted</dt>
          <dd className="tabular mt-1 text-sm text-white">{formatDuration(session.duration_minutes)}</dd>
        </div>
        <div>
          <dt className="text-xs text-mute">Logged</dt>
          <dd className="tabular mt-1 text-sm text-white">{session.finalized_at ? formatPokerDateTime(session.finalized_at) : '—'}</dd>
          {edited && <dd className="tabular mt-0.5 text-xs text-mute">edited {formatPokerDateTime(session.updated_at)}</dd>}
        </div>
        <div>
          <dt className="text-xs text-mute">Confirmed</dt>
          <dd className="tabular mt-1 text-sm text-white">{counts ? `${acks.acked} of ${acks.total}` : '—'}</dd>
          {counts && acks.disputed > 0 && <dd className="mt-0.5 text-xs text-loss">{acks.disputed} disputed</dd>}
        </div>
      </dl>

      {counts && guestEntries.length > 0 && (
        <p className="mt-7 text-[13px] text-mute">
          {guestEntries.length === 1
            ? `${guestEntries[0].user?.display_name ?? 'One player'} played as a guest. That line counts now and can be confirmed once ${isHost ? 'you link' : `${firstName(session.host?.display_name ?? 'the host')} links`} the account.`
            : `${numberWord(guestEntries.length, true)} players sat as guests. Their lines count now and can be confirmed once ${isHost ? 'you link' : `${firstName(session.host?.display_name ?? 'the host')} links`} their accounts.`}{' '}
          {isHost && (
            <TextLink href="/poker/guests" className="text-[13px]">
              Link accounts
            </TextLink>
          )}
        </p>
      )}

      {isHost && counts && (
        <section className="mt-8 border-t border-line pt-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-xl text-sm text-zinc-400">
              <span className="text-white">You logged this night.</span> Editing resets everyone’s confirmations. Voiding removes it from every stat.
            </p>
            {confirming !== 'void' && (
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" href={`/poker/sessions/${session.id}/edit`}>
                  Edit ledger
                </Button>
                <Button variant="danger" onClick={() => setConfirming('void')} disabled={busy} type="button">
                  Void
                </Button>
              </div>
            )}
          </div>
          {confirming === 'void' && (
            <ConfirmStrip
              text="Void this session? It will be excluded from every stat. This cannot be undone."
              tone="danger"
              confirmLabel="Void session"
              busy={busy}
              onBack={() => setConfirming(null)}
              onConfirm={() => callApi('/api/poker/sessions/void', { session_id: session.id }, 'Session voided.')}
              inline
            />
          )}
        </section>
      )}

      {session.notes && (
        <section className="mt-8 border-t border-line pt-5">
          <h2 className="font-sans text-xs tracking-normal text-mute">Notes</h2>
          <p className="mt-1.5 max-w-2xl whitespace-pre-wrap text-sm text-zinc-300">{session.notes}</p>
        </section>
      )}
    </div>
  )
}
