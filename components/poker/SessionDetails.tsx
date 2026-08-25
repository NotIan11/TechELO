'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import Banner from '@/components/ui/Banner'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import ConfirmStrip from '@/components/ui/ConfirmStrip'
import GameIcon from '@/components/ui/GameIcon'
import IconTile from '@/components/ui/IconTile'
import MoneyDelta from '@/components/ui/MoneyDelta'
import PageHeader from '@/components/ui/PageHeader'
import PokerStatusBadge from '@/components/ui/PokerStatusBadge'
import TextLink from '@/components/ui/TextLink'
import LedgerTable from './LedgerTable'
import PlayerName from './PlayerName'
import ShareButton from './ShareButton'
import SponsorRow from './SponsorRow'
import { formatCents, formatDuration } from '@/lib/poker/money'
import { formatPokerDateTime } from '@/lib/poker/periods'
import { ackSummary, binkOfTheNight, computeTotals, sessionTitle } from '@/lib/poker/stats'
import type { SessionFull } from '@/lib/poker/queries'
import { cn } from '@/lib/utils'

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
      value={reason}
      maxLength={500}
      onChange={(e) => setReason(e.target.value)}
    />
  )

  const nudge = myEntry
    ? myEntry.net_cents < 0
      ? { text: 'Ping pong is free. Put a rating on the line instead.', label: 'Challenge someone', href: '/matches/new' }
      : myEntry.net_cents > 0
        ? { text: `Up ${formatCents(myEntry.net_cents, { sign: true, compact: true })}. Defend something that is not money.`, label: 'Challenge someone at pool', href: '/matches/new?game_type=pool' }
        : null
    : { text: 'Not at this table? The pool and ping pong rankings are open all term.', label: 'See the rankings', href: '/leaderboard' }

  return (
    <div className="space-y-5">
      <PageHeader
        size="md"
        leading={<IconTile icon={<GameIcon game="poker" />} />}
        title={title}
        meta={
          <>
            <TextLink href="/poker" muted className="text-xs">
              Poker
            </TextLink>
            <Badge tone="orange">{isTourney ? (session.is_official ? 'Official tournament' : 'Tournament') : 'Cash game'}</Badge>
            {isTourney
              ? session.standard_buy_in_cents != null && <span>{session.standard_buy_in_cents === 0 ? 'Free entry' : `${formatCents(session.standard_buy_in_cents, { compact: true })} entry`}</span>
              : session.stakes && <span>{session.stakes}</span>}
            {session.variant && <span>· {session.variant}</span>}
            <span>· {formatPokerDateTime(session.played_at)}</span>
            {session.duration_minutes && <span>· {formatDuration(session.duration_minutes)}</span>}
            {session.location && <span>· {session.location}</span>}
          </>
        }
        actions={
          <>
            <PokerStatusBadge status={session.status} acked={acks.acked} total={acks.total} />
            <ShareButton path={`/poker/sessions/${session.id}`} title={title} />
          </>
        }
      />

      {session.is_official && session.sponsors.length > 0 && (
        <Card padding="sm">
          <SponsorRow sponsors={session.sponsors} />
        </Card>
      )}

      {notice && <Banner tone="success">{notice}</Banner>}
      {error && <Banner tone="error">{error}</Banner>}

      {session.status === 'voided' && <Banner tone="info">This session was voided by the host and does not count toward anything.</Banner>}
      {session.status === 'disputed' && (
        <Banner tone="error">
          <p className="font-medium">Disputed</p>
          <ul className="mt-1 space-y-1">
            {disputes.map((d) => (
              <li key={d.id}>
                <span className="font-medium">{d.user?.display_name ?? 'Someone'}:</span> “{d.dispute_reason}”
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs opacity-80">
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

      {bink && bink.user && (
        <Card className="border-win/20 bg-win/5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar src={bink.user.profile_image_url} name={bink.user.display_name} size="md" />
              <div>
                <p className="eyebrow text-win/80">Bink of the night</p>
                <p className="font-display font-semibold text-white">
                  {bink.user.display_name}
                  {bink.user_id === currentUserId && <span className="ml-1.5 text-xs font-normal text-orange-400">you</span>}
                </p>
              </div>
            </div>
            <MoneyDelta cents={bink.net_cents} size="lg" compact />
          </div>
        </Card>
      )}

      <LedgerTable
        kind={session.kind}
        entries={session.entries}
        currentUserId={currentUserId}
        binkId={bink?.id ?? null}
        totals={totals}
        prizePoolCents={isTourney ? session.prize_pool_cents : null}
        showAcks={counts}
      />

      {counts && (
        <Card padding="sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center -space-x-1.5">
              {session.entries.map((e) => (
                <span
                  key={e.id}
                  className={cn('inline-flex rounded-full ring-2 ring-ink-800', e.disputed_at ? 'ring-loss' : e.acknowledged_at ? '' : 'opacity-40')}
                  title={`${e.user?.display_name ?? '?'} · ${e.disputed_at ? 'disputed' : e.acknowledged_at ? 'confirmed' : 'not yet'}`}
                >
                  <Avatar src={e.user?.profile_image_url} name={e.user?.display_name ?? '?'} size="xs" />
                </span>
              ))}
            </div>
            <p className="text-sm text-zinc-400">
              {acks.verified ? (
                <span className="text-win">Everyone confirmed this ledger.</span>
              ) : (
                <>
                  {acks.acked} of {acks.total} confirmed
                  {acks.disputed > 0 && <span className="text-loss"> · {acks.disputed} disputed</span>}
                </>
              )}
            </p>
          </div>
        </Card>
      )}

      {counts && myEntry && !isHost && (
        <Card>
          {myEntry.disputed_at ? (
            <>
              <p className="font-medium text-white">You disputed this ledger.</p>
              <p className="mt-1 text-sm text-zinc-400">“{myEntry.dispute_reason}”</p>
              {confirming === 'withdraw' ? (
                <ConfirmStrip
                  text="Withdraw your dispute?"
                  tone="neutral"
                  busy={busy}
                  onBack={() => setConfirming(null)}
                  onConfirm={() => callApi('/api/poker/entries/withdraw-dispute', { entry_id: myEntry.id }, 'Dispute withdrawn.')}
                  inline
                />
              ) : (
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button onClick={() => callApi('/api/poker/entries/acknowledge', { entry_id: myEntry.id }, 'Ledger confirmed.')} disabled={busy} type="button">
                    Actually, looks right
                  </Button>
                  <Button variant="secondary" onClick={() => setConfirming('withdraw')} disabled={busy} type="button">
                    Withdraw dispute
                  </Button>
                </div>
              )}
            </>
          ) : myEntry.acknowledged_at ? (
            <>
              <p className="text-sm text-zinc-300">
                You confirmed this ledger. Your line: <MoneyDelta cents={myEntry.net_cents} chip compact />
              </p>
              {confirming === 'dispute' ? (
                <ConfirmStrip
                  text="Something wrong? Tell the host what is off."
                  tone="danger"
                  busy={busy}
                  onBack={() => setConfirming(null)}
                  onConfirm={() => callApi('/api/poker/entries/dispute', { entry_id: myEntry.id, reason }, 'Dispute sent. The host has been notified.')}
                >
                  {disputeBox}
                </ConfirmStrip>
              ) : (
                <TextLink muted onClick={() => setConfirming('dispute')} className="mt-2 text-xs">
                  Something wrong? Dispute it
                </TextLink>
              )}
            </>
          ) : (
            <>
              <p className="font-medium text-white">Does this ledger look right?</p>
              <p className="mt-1 text-sm text-zinc-400">
                Your line: in {formatCents(myEntry.buy_in_cents, { compact: true })}, out {formatCents(myEntry.cash_out_cents ?? 0, { compact: true })}, net{' '}
                <MoneyDelta cents={myEntry.net_cents} chip compact />
              </p>
              {confirming === 'dispute' ? (
                <ConfirmStrip
                  text="What is off? The host will see your note."
                  tone="danger"
                  busy={busy}
                  onBack={() => setConfirming(null)}
                  onConfirm={() => callApi('/api/poker/entries/dispute', { entry_id: myEntry.id, reason }, 'Dispute sent. The host has been notified.')}
                >
                  {disputeBox}
                </ConfirmStrip>
              ) : (
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button onClick={() => callApi('/api/poker/entries/acknowledge', { entry_id: myEntry.id }, 'Ledger confirmed.')} disabled={busy} type="button">
                    Looks right
                  </Button>
                  <Button variant="danger" onClick={() => setConfirming('dispute')} disabled={busy} type="button">
                    Dispute
                  </Button>
                </div>
              )}
              <p className="mt-3 text-xs text-zinc-500">The session already counts. Confirming marks it verified.</p>
            </>
          )}
        </Card>
      )}

      {counts && nudge && (
        <p className="text-[13px] text-zinc-400">
          {nudge.text}{' '}
          <TextLink href={nudge.href} arrow="right" className="text-[13px]">
            {nudge.label}
          </TextLink>
        </p>
      )}

      {isHost && counts && (
        <Card>
          <p className="font-medium text-white">You logged this session.</p>
          <p className="mt-1 text-sm text-zinc-400">Editing resets everyone’s confirmations. Voiding removes it from every stat.</p>
          {confirming === 'void' ? (
            <ConfirmStrip
              text="Void this session? It will be excluded from every stat. This cannot be undone."
              tone="danger"
              busy={busy}
              onBack={() => setConfirming(null)}
              onConfirm={() => callApi('/api/poker/sessions/void', { session_id: session.id }, 'Session voided.')}
              inline
            />
          ) : (
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant="secondary" href={`/poker/sessions/${session.id}/edit`}>
                Edit ledger
              </Button>
              <Button variant="danger" onClick={() => setConfirming('void')} disabled={busy} type="button">
                Void
              </Button>
            </div>
          )}
        </Card>
      )}

      {session.notes && (
        <Card padding="sm">
          <p className="eyebrow">Notes</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-300">{session.notes}</p>
        </Card>
      )}

      <Card padding="sm">
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="eyebrow">Host</dt>
            <dd className="mt-1">
              <PlayerName player={session.host ? { ...session.host, dorm_name: null } : null} size="xs" />
            </dd>
          </div>
          <div>
            <dt className="eyebrow">Played</dt>
            <dd className="mt-0.5 text-zinc-300">{formatPokerDateTime(session.played_at)}</dd>
          </div>
          <div>
            <dt className="eyebrow">Logged</dt>
            <dd className="mt-0.5 text-zinc-300">{session.finalized_at ? formatPokerDateTime(session.finalized_at) : '—'}</dd>
          </div>
          <div>
            <dt className="eyebrow">Last edited</dt>
            <dd className="mt-0.5 text-zinc-300">
              {session.finalized_at && new Date(session.updated_at).getTime() - new Date(session.finalized_at).getTime() > 60_000
                ? formatPokerDateTime(session.updated_at)
                : '—'}
            </dd>
          </div>
        </dl>
      </Card>
    </div>
  )
}
