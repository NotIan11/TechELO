'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import Banner from '@/components/ui/Banner'
import Button from '@/components/ui/Button'
import { ChipToggle } from '@/components/ui/ChipSelect'
import ConfirmStrip from '@/components/ui/ConfirmStrip'
import PageIntro, { Num } from '@/components/ui/PageIntro'
import TextLink from '@/components/ui/TextLink'
import ShareButton from './ShareButton'
import SponsorRow from './SponsorRow'
import { formatPokerDateTime, fromDateTimeLocalValue, toDateTimeLocalValue } from '@/lib/poker/periods'
import { numberWord } from '@/lib/poker/phrases'
import { sessionTitle } from '@/lib/poker/stats'
import type { SessionFull } from '@/lib/poker/queries'
import type { PokerSponsorRow } from '@/lib/poker/types'

const FIELD_LABEL = 'mb-2 block text-[13px] text-mute'

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

  const going = session.rsvp_count

  return (
    <div>
      <PageIntro
        className="sm:items-start"
        kicker={
          <>
            <TextLink href="/poker/sessions" muted>
              Poker sessions
            </TextLink>
            <span>· Official Tech Poker tournament</span>
            <Badge tone="orange" dot>
              Upcoming
            </Badge>
          </>
        }
        title={displayTitle}
        lede={
          <>
            <Num>{when}</Num>
            {session.location && <> at {session.location}</>}. Entry is free
            {going === 0 ? (
              ' and nobody has said they are in yet.'
            ) : (
              <>
                {' '}
                and <Num>{going}</Num> {going === 1 ? 'player is' : 'players are'} in.
              </>
            )}
          </>
        }
        actions={<ShareButton path={`/poker/sessions/${session.id}`} title={displayTitle} />}
      />

      {session.sponsors.length > 0 && <SponsorRow sponsors={session.sponsors} className="mt-7" />}
      {session.notes && <p className="mt-7 max-w-2xl whitespace-pre-wrap text-[15px] text-zinc-300">{session.notes}</p>}

      {(notice || error) && (
        <div className="mt-6 space-y-2">
          {notice && <Banner tone="success">{notice}</Banner>}
          {error && <Banner tone="error">{error}</Banner>}
        </div>
      )}

      <section className="mt-9 flex flex-wrap items-center justify-between gap-5 rounded border border-line-strong px-5 py-5 sm:px-6">
        <div className="min-w-0">
          <h2 className="font-display text-[22px] tracking-tight text-white">{myRsvp ? 'You are in' : 'Are you in?'}</h2>
          <p className="mt-1.5 text-[13px] text-mute">Everyone who says yes is on the ledger when the tournament starts.</p>
        </div>
        {currentUserId ? (
          myRsvp ? (
            <Button variant="secondary" size="lg" disabled={busy} type="button" onClick={() => post('/api/poker/sessions/rsvp', { session_id: session.id, attending: false })}>
              Can’t make it
            </Button>
          ) : (
            <Button size="lg" disabled={busy} type="button" onClick={() => post('/api/poker/sessions/rsvp', { session_id: session.id, attending: true })}>
              I’m in
            </Button>
          )
        ) : (
          <Button size="lg" href={`/login?redirect=/poker/sessions/${session.id}`}>
            Sign in to RSVP
          </Button>
        )}
      </section>

      <section className="mt-10">
        <h2 className="border-b border-line-bright pb-2.5 font-sans text-xs tracking-normal text-mute">
          {going === 0 ? 'Nobody has RSVP’d yet' : `${numberWord(going, true)} going`}
        </h2>
        {session.rsvps.length > 0 && (
          <ul className="sm:columns-2 sm:gap-x-12">
            {session.rsvps.map((r) =>
              r.user ? (
                <li key={r.user.id} className="flex min-h-[48px] break-inside-avoid items-baseline gap-2 border-b border-line py-3">
                  <Link href={`/profile/${r.user.id}`} className="truncate text-[15px] text-white underline-offset-4 hover:underline">
                    {r.user.display_name}
                  </Link>
                  {r.user.id === currentUserId && <span className="text-xs text-orange-400">you</span>}
                </li>
              ) : null
            )}
          </ul>
        )}
      </section>

      {isHost && (
        <section className="mt-10 border-t border-line-strong pt-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-xl text-sm text-zinc-400">
              <span className="text-white">You are organizing this.</span> Start it when the cards are in the air. Everyone who RSVP’d lands in the ledger.
            </p>
            {confirming == null && !editing && (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setConfirming('open')} disabled={busy} type="button">
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
              confirmLabel="Start tournament"
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
              confirmLabel="Cancel event"
              busy={busy}
              busyLabel="Cancelling…"
              onBack={() => setConfirming(null)}
              onConfirm={() => post('/api/poker/sessions/void', { session_id: session.id }, 'Event cancelled.')}
              className="mt-4"
            />
          )}

          {editing && (
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="ev-title" className={FIELD_LABEL}>
                  Title, or leave blank for the term title
                </label>
                <input id="ev-title" type="text" className="input" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <label htmlFor="ev-when" className={FIELD_LABEL}>
                  When
                </label>
                <input id="ev-when" type="datetime-local" className="input tabular" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
              </div>
              <div>
                <label htmlFor="ev-where" className={FIELD_LABEL}>
                  Where
                </label>
                <input id="ev-where" type="text" className="input" value={location} maxLength={80} onChange={(e) => setLocation(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="ev-notes" className={FIELD_LABEL}>
                  Description
                </label>
                <textarea id="ev-notes" className="input min-h-[96px]" value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <p className={FIELD_LABEL}>Sponsors</p>
                {sponsors.length === 0 ? (
                  <p className="text-sm text-mute">
                    No sponsors on file.{' '}
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
                <Button variant="outline" onClick={saveDetails} disabled={busy} type="button">
                  {busy ? 'Saving…' : 'Save details'}
                </Button>
                <Button variant="ghost" onClick={() => setEditing(false)} disabled={busy} type="button">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </section>
      )}

      <p className="mt-10 text-xs text-mute">Hosted by {session.host?.display_name ?? 'the poker club'} · Tech Poker</p>
    </div>
  )
}
