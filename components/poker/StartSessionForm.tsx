'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Banner from '@/components/ui/Banner'
import Button from '@/components/ui/Button'
import ChipSelect, { ChipToggle } from '@/components/ui/ChipSelect'
import DollarInput from '@/components/ui/DollarInput'
import SegmentedBox from './SegmentedBox'
import { BUY_IN_PRESETS_CENTS, ENTRY_FEE_PRESETS_CENTS, STAKES_PRESETS, VARIANT_OPTIONS } from '@/lib/poker/constants'
import { formatCents } from '@/lib/poker/money'
import { fromDateTimeLocalValue, termLabel, toDateTimeLocalValue } from '@/lib/poker/periods'
import type { PokerSessionKind, PokerSponsorRow } from '@/lib/poker/types'

interface StartSessionFormProps {
  isOfficer: boolean
  sponsors: PokerSponsorRow[]
  houseNames: string[]
  initialKind: PokerSessionKind
}

const FIELD_LABEL = 'mb-2 block text-[13px] text-mute'

/** Opens a poker table. Sits in a narrow column under a heading supplied by the page. */
export default function StartSessionForm({ isOfficer, sponsors, houseNames, initialKind }: StartSessionFormProps) {
  const router = useRouter()
  const [kind, setKind] = useState<PokerSessionKind>(initialKind)
  const [stakes, setStakes] = useState<string | null>(STAKES_PRESETS[1])
  const [variant, setVariant] = useState<string | null>('NLHE')
  const [standardBuyIn, setStandardBuyIn] = useState<number | null>(2000)
  const [location, setLocation] = useState('')
  const [title, setTitle] = useState('')
  const [backdate, setBackdate] = useState(false)
  const [playedAt, setPlayedAt] = useState(() => toDateTimeLocalValue(new Date()))
  const [official, setOfficial] = useState(false)
  const [scheduleAhead, setScheduleAhead] = useState(true)
  const [scheduledFor, setScheduledFor] = useState('')
  const [sponsorIds, setSponsorIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const buyInPresets = useMemo(
    () =>
      (kind === 'cash' ? BUY_IN_PRESETS_CENTS : ENTRY_FEE_PRESETS_CENTS).map((c) => ({
        value: String(c),
        label: formatCents(c, { compact: true }),
      })),
    [kind]
  )

  const officialTitlePreview = useMemo(() => {
    const when = scheduledFor ? fromDateTimeLocalValue(scheduledFor) : null
    return `${termLabel(when ?? new Date())} Caltech Poker Tournament`
  }, [scheduledFor])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const isOfficial = kind === 'tournament' && isOfficer && official
      const body: Record<string, unknown> = {
        kind,
        stakes: kind === 'cash' ? stakes : null,
        variant,
        location: location.trim() || null,
        title: title.trim() || null,
        standard_buy_in_cents: isOfficial ? 0 : standardBuyIn,
        is_official: isOfficial,
      }
      if (backdate && !isOfficial) {
        const iso = fromDateTimeLocalValue(playedAt)
        if (!iso) throw new Error('Enter a valid date and time.')
        body.played_at = iso
      }
      if (isOfficial) {
        body.sponsor_ids = sponsorIds
        if (scheduleAhead) {
          const iso = fromDateTimeLocalValue(scheduledFor)
          if (!iso) throw new Error('Enter the tournament date and time.')
          body.scheduled_for = iso
        }
      }
      const res = await fetch('/api/poker/sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not start the session')
      router.push(`/poker/sessions/${data.session.id}`)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
      setLoading(false)
    }
  }

  const isOfficial = kind === 'tournament' && isOfficer && official

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <SegmentedBox<PokerSessionKind>
        aria-label="Kind"
        value={kind}
        onChange={(k) => {
          if (k === kind) return
          setKind(k)
          setStandardBuyIn(k === 'cash' ? 2000 : 1000)
        }}
        options={[
          { value: 'cash', label: 'Cash game' },
          { value: 'tournament', label: 'Tournament' },
        ]}
      />

      {kind === 'tournament' && isOfficer && (
        <label className="flex cursor-pointer items-start gap-3 border-y border-line py-3.5">
          <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-orange-500" checked={official} onChange={(e) => setOfficial(e.target.checked)} />
          <span>
            <span className="block text-sm text-white">Official Tech Poker tournament</span>
            <span className="mt-0.5 block text-[13px] text-mute">
              Free entry, sponsor logos, and a public page people can RSVP to. Titled “{officialTitlePreview}” unless you name it.
            </span>
          </span>
        </label>
      )}

      {isOfficial ? (
        <>
          <SegmentedBox
            aria-label="When it starts"
            options={[
              { value: 'schedule', label: 'Schedule it' },
              { value: 'now', label: 'Starting now' },
            ]}
            value={scheduleAhead ? 'schedule' : 'now'}
            onChange={(v) => setScheduleAhead(v === 'schedule')}
          />
          {scheduleAhead && (
            <div>
              <label htmlFor="scheduled-for" className={FIELD_LABEL}>
                When
              </label>
              <input id="scheduled-for" type="datetime-local" className="input tabular" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} required />
            </div>
          )}
          <div>
            <label htmlFor="title" className={FIELD_LABEL}>
              Title, if not the term title
            </label>
            <input id="title" type="text" className="input" placeholder={officialTitlePreview} value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <p className={FIELD_LABEL}>Sponsors</p>
            {sponsors.length === 0 ? (
              <p className="text-sm text-mute">
                No sponsors on file yet.{' '}
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
                      {s.logo_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.logo_url} alt="" className="h-5 w-5 object-contain" />
                      )}
                      {s.name}
                    </ChipToggle>
                  )
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {kind === 'cash' && (
            <div>
              <p className={FIELD_LABEL}>Stakes</p>
              <ChipSelect
                options={STAKES_PRESETS.map((s) => ({ value: s, label: s }))}
                value={stakes}
                onChange={setStakes}
                allowCustom
                customPlaceholder="$0.05/$0.10"
                aria-label="Stakes"
                className="tabular"
              />
            </div>
          )}
          <div>
            <p className={FIELD_LABEL}>{kind === 'cash' ? 'Standard buy-in' : 'Entry fee'}</p>
            <div className="flex flex-wrap items-center gap-2">
              <ChipSelect
                options={buyInPresets}
                value={standardBuyIn != null ? String(standardBuyIn) : null}
                onChange={(v) => setStandardBuyIn(v != null ? Number(v) : null)}
                clearable={false}
                aria-label={kind === 'cash' ? 'Standard buy-in' : 'Entry fee'}
                className="tabular [&>button]:min-w-[56px] [&>button]:justify-center"
              />
              <DollarInput valueCents={standardBuyIn} onChange={setStandardBuyIn} className="w-28 [&_input]:tabular" aria-label="Another amount" chain={false} />
            </div>
            <p className="mt-2 text-xs text-mute">
              {kind === 'cash'
                ? 'One tap adds this much when someone reloads. Every amount stays editable.'
                : 'Applied to every entry; rebuys and add-ons multiply it. Editable per player.'}
            </p>
          </div>
          {kind === 'tournament' && (
            <div>
              <label htmlFor="title" className={FIELD_LABEL}>
                Title, if you want one
              </label>
              <input id="title" type="text" className="input" placeholder="Friday night freezeout" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
            </div>
          )}
        </>
      )}

      <div>
        <p className={FIELD_LABEL}>Variant</p>
        <ChipSelect options={VARIANT_OPTIONS.map((v) => ({ value: v, label: v }))} value={variant} onChange={setVariant} aria-label="Variant" />
      </div>

      <div>
        <label htmlFor="location" className={FIELD_LABEL}>
          Where, if you want to say
        </label>
        <input id="location" type="text" className="input" list="house-locations" placeholder="Lloyd lounge" value={location} maxLength={80} onChange={(e) => setLocation(e.target.value)} />
        <datalist id="house-locations">
          {houseNames.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </div>

      {!isOfficial && (
        <div>
          <label className="flex min-h-[44px] cursor-pointer items-center gap-3 text-sm text-zinc-300">
            <input type="checkbox" className="h-4 w-4 shrink-0 accent-orange-500" checked={backdate} onChange={(e) => setBackdate(e.target.checked)} />
            Log a night that already happened
          </label>
          {backdate && (
            <input
              type="datetime-local"
              aria-label="When it was played"
              className="input tabular mt-2"
              value={playedAt}
              max={toDateTimeLocalValue(new Date())}
              onChange={(e) => setPlayedAt(e.target.value)}
            />
          )}
        </div>
      )}

      {error && <Banner tone="error">{error}</Banner>}

      <div>
        <Button type="submit" size="lg" variant="outline" disabled={loading}>
          {loading
            ? 'Opening…'
            : isOfficial
              ? scheduleAhead
                ? 'Schedule tournament'
                : 'Start official tournament'
              : backdate
                ? 'Open the ledger'
                : kind === 'cash'
                  ? 'Open the table'
                  : 'Start tournament'}
        </Button>
        {!backdate && !isOfficial && <p className="mt-3 text-[13px] text-mute">Saved the moment it opens. Add players as they sit down.</p>}
      </div>
    </form>
  )
}
