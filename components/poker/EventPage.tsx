'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import Banner from '@/components/ui/Banner'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import PokerStatusBadge from '@/components/ui/PokerStatusBadge'
import ShareButton from './ShareButton'
import SponsorRow from './SponsorRow'
import { formatPokerDateTime, fromDateTimeLocalValue, toDateTimeLocalValue } from '@/lib/poker/periods'
import { sessionTitle } from '@/lib/poker/stats'
import type { SessionFull } from '@/lib/poker/queries'
import type { PokerSponsorRow } from '@/lib/poker/types'
import { cn } from '@/lib/utils'

interface EventPageProps {
  session: SessionFull
  currentUserId: string | null
  isHost: boolean
  isOfficer: boolean
  sponsors: PokerSponsorRow[]
}

/** Public event page for a scheduled official tournament: sponsors, RSVPs, officer controls */
export default function EventPage({ session, currentUserId, isHost, sponsors }: EventPageProps) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirming, setConfirming] = useState<'open' | 'void' | null>(null)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(session.title ?? '')
  const [scheduledFor, setScheduledFor] = useState(
    session.scheduled_for ? toDateTimeLocalValue(new Date(session.scheduled_for)) : ''
  )
  const [location, setLocation] = useState(session.location ?? '')
  const [notes, setNotes] = useState(session.notes ?? '')
  const [sponsorIds, setSponsorIds] = useState<string[]>(session.sponsors.map((s) => s.id))

  const myRsvp = currentUserId ? session.rsvps.some((r) => r.user?.id === currentUserId) : false
  const displayTitle = sessionTitle(session)
  const when = session.scheduled_for ? formatPokerDateTime(session.scheduled_for) : 'Date TBA'

  const post = async (endpoint: string, body: Record<string, unknown>, successText?: string) => {
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
      if (successText) setNotice(successText)
      router.refresh()
      return true
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
      return false
    } finally {
      setBusy(false)
      setConfirming(null)
    }
  }

  const saveDetails = async () => {
    const iso = scheduledFor ? fromDateTimeLocalValue(scheduledFor) : null
    if (scheduledFor && !iso) {
      setError('Enter a valid date and time.')
      return
    }
    const ok = await post('/api/poker/sessions/save', {
      session_id: session.id,
      version: session.version,
      title: title.trim() || null,
      scheduled_for: iso,
      location: location.trim() || null,
      notes: notes.trim() || null,
      sponsor_ids: sponsorIds,
      entries: [],
    }, 'Event details saved.')
    if (ok) setEditing(false)
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-500/15 via-raise to-raise p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <Badge tone="poker" dot>
            Official Tech Poker tournament
          </Badge>
          <div className="flex items-center gap-2">
            <PokerStatusBadge status="scheduled" />
            <ShareButton path={`/poker/sessions/${session.id}`} title={displayTitle} />
          </div>
        </div>
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">{displayTitle}</h1>
        <p className="mt-2 text-slate-300">
          {when}
          {session.location && <> · {session.location}</>}
          <span className="text-slate-500"> · Free entry</span>
        </p>
        {session.sponsors.length > 0 && <SponsorRow sponsors={session.sponsors} className="mt-5" />}
        {session.notes && <p className="mt-5 max-w-2xl whitespace-pre-wrap text-sm text-slate-300">{session.notes}</p>}
      </div>

      {notice && <Banner tone="success">{notice}</Banner>}
      {error && <Banner tone="error">{error}</Banner>}

      {/* RSVP */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-display text-lg font-semibold text-white">
              {session.rsvp_count === 0 ? 'Be the first to RSVP' : `${session.rsvp_count} ${session.rsvp_count === 1 ? 'player is' : 'players are'} in`}
            </p>
            <p className="mt-0.5 text-sm text-slate-400">RSVPs pre-fill the ledger when the tournament starts.</p>
          </div>
          {currentUserId ? (
            myRsvp ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-emerald-300">You’re in ✓</span>
                <Button variant="secondary" size="sm" disabled={busy} type="button" onClick={() => post('/api/poker/sessions/rsvp', { session_id: session.id, attending: false })}>
                  Can’t make it
                </Button>
              </div>
            ) : (
              <Button variant="success" disabled={busy} type="button" onClick={() => post('/api/poker/sessions/rsvp', { session_id: session.id, attending: true })}>
                I’m in
              </Button>
            )
          ) : (
            <Button href={`/login?redirect=/poker/sessions/${session.id}`} variant="primary">
              Sign in to RSVP
            </Button>
          )}
        </div>
        {session.rsvps.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-2">
            {session.rsvps.map((r) =>
              r.user ? (
                <li key={r.user.id} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-3 text-sm text-slate-200">
                  <Avatar src={r.user.profile_image_url} name={r.user.display_name} size="xs" />
                  {r.user.display_name}
                </li>
              ) : null
            )}
          </ul>
        )}
      </Card>

      {/* Officer controls */}
      {isHost && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium text-white">Organizer controls</p>
              <p className="mt-0.5 text-sm text-slate-400">Start it when the cards are in the air — everyone who RSVP’d lands in the ledger.</p>
            </div>
            {confirming == null && !editing && (
              <div className="flex flex-wrap gap-2">
                <Button variant="success" onClick={() => setConfirming('open')} disabled={busy} type="button">
                  Start tournament
                </Button>
                <Button variant="secondary" onClick={() => setEditing(true)} disabled={busy} type="button">
                  Edit details
                </Button>
                <Button variant="danger" onClick={() => setConfirming('void')} disabled={busy} type="button">
                  Cancel event
                </Button>
              </div>
            )}
          </div>

          {confirming === 'open' && (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-sm text-slate-200">Start the tournament now? {session.rsvp_count} RSVP{session.rsvp_count === 1 ? '' : 's'} will be added to the ledger.</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="success" disabled={busy} type="button" onClick={() => post('/api/poker/sessions/open', { session_id: session.id })}>
                  {busy ? 'Starting…' : 'Confirm'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirming(null)} disabled={busy} type="button">
                  Back
                </Button>
              </div>
            </div>
          )}
          {confirming === 'void' && (
            <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.04] p-3">
              <p className="text-sm text-red-100">Cancel this event? The page stays visible as voided and can’t be reopened.</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="danger" disabled={busy} type="button" onClick={() => post('/api/poker/sessions/void', { session_id: session.id }, 'Event cancelled.')}>
                  {busy ? 'Cancelling…' : 'Confirm'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirming(null)} disabled={busy} type="button">
                  Back
                </Button>
              </div>
            </div>
          )}

          {editing && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="ev-title" className="label">
                  Title <span className="font-normal text-slate-500">(blank = term title)</span>
                </label>
                <input id="ev-title" type="text" className="input" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <label htmlFor="ev-when" className="label">
                  When
                </label>
                <input id="ev-when" type="datetime-local" className="input" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
              </div>
              <div>
                <label htmlFor="ev-where" className="label">
                  Location
                </label>
                <input id="ev-where" type="text" className="input" value={location} maxLength={80} onChange={(e) => setLocation(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="ev-notes" className="label">
                  Description
                </label>
                <textarea id="ev-notes" className="input min-h-[96px]" value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <p className="label">Sponsors</p>
                {sponsors.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No sponsors in the library —{' '}
                    <a href="/poker/sponsors" className="text-orange-300 underline">
                      add some
                    </a>
                    .
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {sponsors.map((s) => {
                      const active = sponsorIds.includes(s.id)
                      return (
                        <button
                          key={s.id}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setSponsorIds((ids) => (active ? ids.filter((id) => id !== s.id) : [...ids, s.id]))}
                          className={cn(
                            'inline-flex min-h-[36px] items-center gap-2 rounded-full border px-3 text-sm font-medium transition',
                            active ? 'border-violet-400/50 bg-violet-400/10 text-violet-200' : 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]'
                          )}
                        >
                          {s.name}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
              <div className="flex gap-2 sm:col-span-2">
                <Button onClick={saveDetails} disabled={busy} type="button">
                  {busy ? 'Saving…' : 'Save details'}
                </Button>
                <Button variant="ghost" onClick={() => setEditing(false)} disabled={busy} type="button">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <p className="text-center text-xs text-slate-500">
        Hosted by {session.host?.display_name ?? 'the poker club'} · Tech Poker
      </p>
    </div>
  )
}
