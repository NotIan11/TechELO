'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import Banner from '@/components/ui/Banner'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { ChipToggle } from '@/components/ui/ChipSelect'
import ConfirmStrip from '@/components/ui/ConfirmStrip'
import Hero from '@/components/ui/Hero'
import Icon from '@/components/ui/Icon'
import PokerStatusBadge from '@/components/ui/PokerStatusBadge'
import ShareButton from './ShareButton'
import SponsorRow from './SponsorRow'
import { formatPokerDateTime, fromDateTimeLocalValue, toDateTimeLocalValue } from '@/lib/poker/periods'
import { sessionTitle } from '@/lib/poker/stats'
import type { SessionFull } from '@/lib/poker/queries'
import type { PokerSponsorRow } from '@/lib/poker/types'

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
  const [scheduledFor, setScheduledFor] = useState(session.scheduled_for ? toDateTimeLocalValue(new Date(session.scheduled_for)) : '')
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
    const ok = await post(
      '/api/poker/sessions/save',
      {
        session_id: session.id,
        version: session.version,
        title: title.trim() || null,
        scheduled_for: iso,
        location: location.trim() || null,
        notes: notes.trim() || null,
        sponsor_ids: sponsorIds,
        entries: [],
      },
      'Event details saved.'
    )
    if (ok) setEditing(false)
  }

  return (
    <div className="space-y-6">
      <Hero
        panel
        eyebrow={
          <Badge tone="orange" dot>
            Official Tech Poker tournament
          </Badge>
        }
        aside={
          <>
            <PokerStatusBadge status="scheduled" />
            <ShareButton path={`/poker/sessions/${session.id}`} title={displayTitle} />
          </>
        }
        title={displayTitle}
        lede={
          <>
            {when}
            {session.location && <> · {session.location}</>}
            <span className="text-zinc-500"> · Free entry</span>
          </>
        }
      >
        {session.sponsors.length > 0 && <SponsorRow sponsors={session.sponsors} className="mt-5" />}
        {session.notes && <p className="mt-5 max-w-2xl whitespace-pre-wrap border-t border-line pt-5 text-sm text-zinc-300">{session.notes}</p>}
      </Hero>

      {notice && <Banner tone="success">{notice}</Banner>}
      {error && <Banner tone="error">{error}</Banner>}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-display text-lg font-semibold text-white">
              {session.rsvp_count === 0 ? 'Nobody has RSVP’d yet' : `${session.rsvp_count} ${session.rsvp_count === 1 ? 'player is' : 'players are'} in`}
            </p>
            <p className="mt-0.5 text-sm text-zinc-400">RSVPs pre-fill the ledger when the tournament starts.</p>
          </div>
          {currentUserId ? (
            myRsvp ? (
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 text-sm text-win">
                  <Icon name="check" className="h-4 w-4" strokeWidth={2.5} /> You are in
                </span>
                <Button variant="secondary" size="sm" disabled={busy} type="button" onClick={() => post('/api/poker/sessions/rsvp', { session_id: session.id, attending: false })}>
                  Can’t make it
                </Button>
              </div>
            ) : (
              <Button disabled={busy} type="button" onClick={() => post('/api/poker/sessions/rsvp', { session_id: session.id, attending: true })}>
                I’m in
              </Button>
            )
          ) : (
            <Button href={`/login?redirect=/poker/sessions/${session.id}`}>Sign in to RSVP</Button>
          )}
        </div>
        {session.rsvps.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-2">
            {session.rsvps.map((r) =>
              r.user ? (
                <li key={r.user.id} className="inline-flex items-center gap-2 rounded-full border border-line bg-ink-700 py-1 pl-1 pr-3 text-sm text-zinc-200">
                  <Avatar src={r.user.profile_image_url} name={r.user.display_name} size="xs" />
                  {r.user.display_name}
                </li>
              ) : null
            )}
          </ul>
        )}
      </Card>

      {isHost && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium text-white">Organizer controls</p>
              <p className="mt-0.5 text-sm text-zinc-400">Start it when the cards are in the air. Everyone who RSVP’d lands in the ledger.</p>
            </div>
            {confirming == null && !editing && (
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setConfirming('open')} disabled={busy} type="button">
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
            <ConfirmStrip
              text={`Start the tournament now? ${session.rsvp_count} RSVP${session.rsvp_count === 1 ? '' : 's'} will be added to the ledger.`}
              busy={busy}
              busyLabel="Starting…"
              onBack={() => setConfirming(null)}
              onConfirm={() => post('/api/poker/sessions/open', { session_id: session.id })}
              className="mt-4"
            />
          )}
          {confirming === 'void' && (
            <ConfirmStrip
              text="Cancel this event? The page stays visible as voided and cannot be reopened."
              tone="danger"
              busy={busy}
              busyLabel="Cancelling…"
              onBack={() => setConfirming(null)}
              onConfirm={() => post('/api/poker/sessions/void', { session_id: session.id }, 'Event cancelled.')}
              className="mt-4"
            />
          )}

          {editing && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="ev-title" className="label">
                  Title <span className="font-normal text-zinc-500">(blank = term title)</span>
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
                  <p className="text-sm text-zinc-500">
                    No sponsors in the library.{' '}
                    <a href="/poker/sponsors" className="link">
                      Add some
                    </a>
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {sponsors.map((s) => {
                      const active = sponsorIds.includes(s.id)
                      return (
                        <ChipToggle key={s.id} pressed={active} onClick={() => setSponsorIds((ids) => (active ? ids.filter((id) => id !== s.id) : [...ids, s.id]))}>
                          {s.name}
                        </ChipToggle>
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

      <p className="text-center text-xs text-zinc-500">Hosted by {session.host?.display_name ?? 'the poker club'} · Tech Poker</p>
    </div>
  )
}
