'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import Banner from '@/components/ui/Banner'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import ChipSelect from '@/components/ui/ChipSelect'
import DollarInput from '@/components/ui/DollarInput'
import GameIcon from '@/components/ui/GameIcon'
import Segmented from '@/components/ui/Segmented'
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
      <div>
        <p className="label">What are you playing?</p>
        <div className="grid grid-cols-2 gap-3">
          {(['cash', 'tournament'] as const).map((k) => {
            const active = kind === k
            return (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setKind(k)
                  setStandardBuyIn(k === 'cash' ? 2000 : 1000)
                }}
                aria-pressed={active}
                className={cn(
                  'card flex flex-col items-center gap-2 p-5 transition',
                  active ? 'border-violet-400/50 bg-violet-400/[0.06] ring-1 ring-violet-400/40' : 'hover:border-white/[0.14]'
                )}
              >
                <GameIcon game="poker" className="h-8 w-8 text-poker" />
                <span className="text-sm font-semibold text-white">{k === 'cash' ? 'Cash game' : 'Tournament'}</span>
                <span className="text-xs text-zinc-500">
                  {k === 'cash' ? 'Buy-ins & cash-outs' : 'Entries, places & payouts'}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {kind === 'tournament' && isOfficer && (
        <Card padding="sm" className={cn(official && 'border-violet-400/40 bg-violet-400/[0.04]')}>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-orange-500"
              checked={official}
              onChange={(e) => setOfficial(e.target.checked)}
            />
            <span>
              <span className="block text-sm font-semibold text-white">Official Tech Poker tournament</span>
              <span className="block text-xs text-zinc-400">
                Free entry, sponsor logos, and a public event page people can RSVP to. Auto-titled “{officialTitlePreview}”.
              </span>
            </span>
          </label>
        </Card>
      )}

      <Card className="space-y-5">
        {isOfficial ? (
          <>
            <div>
              <Segmented
                options={[
                  { value: 'schedule', label: 'Schedule it' },
                  { value: 'now', label: 'Starting now' },
                ]}
                value={scheduleAhead ? 'schedule' : 'now'}
                onChange={(v) => setScheduleAhead(v === 'schedule')}
              />
            </div>
            {scheduleAhead && (
              <div>
                <label htmlFor="scheduled-for" className="label">
                  When
                </label>
                <input
                  id="scheduled-for"
                  type="datetime-local"
                  className="input"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  required
                />
              </div>
            )}
            <div>
              <label htmlFor="title" className="label">
                Title <span className="font-normal text-zinc-500">(optional — defaults to the term title)</span>
              </label>
              <input
                id="title"
                type="text"
                className="input"
                placeholder={officialTitlePreview}
                value={title}
                maxLength={80}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <p className="label">Sponsors</p>
              {sponsors.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  No sponsors in the library yet —{' '}
                  <a href="/poker/sponsors" className="text-orange-400 underline">
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
                        onClick={() =>
                          setSponsorIds((ids) => (active ? ids.filter((id) => id !== s.id) : [...ids, s.id]))
                        }
                        className={cn(
                          'inline-flex min-h-[36px] items-center gap-2 rounded-full border px-3 text-sm font-medium transition',
                          active
                            ? 'border-violet-400/50 bg-violet-400/10 text-violet-200'
                            : 'border-line bg-ink-700 text-zinc-300 hover:bg-white/[0.08]'
                        )}
                      >
                        {s.logo_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.logo_url} alt="" className="h-5 w-5 rounded object-contain" />
                        )}
                        {s.name}
                      </button>
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
                <p className="label">Stakes</p>
                <ChipSelect
                  options={STAKES_PRESETS.map((s) => ({ value: s, label: s }))}
                  value={stakes}
                  onChange={setStakes}
                  allowCustom
                  customPlaceholder="$0.05/$0.10"
                  aria-label="Stakes"
                />
              </div>
            )}
            <div>
              <p className="label">{kind === 'cash' ? 'Standard buy-in' : 'Entry fee'}</p>
              <div className="flex flex-wrap items-center gap-2">
                <ChipSelect
                  options={buyInPresets}
                  value={standardBuyIn != null ? String(standardBuyIn) : null}
                  onChange={(v) => setStandardBuyIn(v != null ? Number(v) : null)}
                  clearable={false}
                  aria-label={kind === 'cash' ? 'Standard buy-in' : 'Entry fee'}
                />
                <DollarInput
                  valueCents={standardBuyIn}
                  onChange={setStandardBuyIn}
                  size="sm"
                  className="w-28"
                  aria-label="Custom amount"
                  chain={false}
                />
              </div>
              <p className="mt-1.5 text-xs text-zinc-500">
                {kind === 'cash'
                  ? 'Used for the “+ buy-in” quick button on each player. Everyone’s amounts stay editable.'
                  : 'Applied to every entry; rebuys and add-ons multiply it. Editable per player.'}
              </p>
            </div>
            {kind === 'tournament' && (
              <div>
                <label htmlFor="title" className="label">
                  Title <span className="font-normal text-zinc-500">(optional)</span>
                </label>
                <input
                  id="title"
                  type="text"
                  className="input"
                  placeholder="Friday night freezeout"
                  value={title}
                  maxLength={80}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
            )}
          </>
        )}

        <div>
          <p className="label">Variant</p>
          <ChipSelect
            options={VARIANT_OPTIONS.map((v) => ({ value: v, label: v }))}
            value={variant}
            onChange={setVariant}
            aria-label="Variant"
          />
        </div>

        <div>
          <label htmlFor="location" className="label">
            Location <span className="font-normal text-zinc-500">(optional)</span>
          </label>
          <input
            id="location"
            type="text"
            className="input"
            list="house-locations"
            placeholder="Lloyd lounge"
            value={location}
            maxLength={80}
            onChange={(e) => setLocation(e.target.value)}
          />
          <datalist id="house-locations">
            {houseNames.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </div>

        {!isOfficial && (
          <div>
            <label className="flex cursor-pointer items-center gap-3 text-sm text-zinc-300">
              <input
                type="checkbox"
                className="h-4 w-4 accent-orange-500"
                checked={backdate}
                onChange={(e) => setBackdate(e.target.checked)}
              />
              This already happened — log a past session
            </label>
            {backdate && (
              <input
                type="datetime-local"
                className="input mt-3"
                value={playedAt}
                max={toDateTimeLocalValue(new Date())}
                onChange={(e) => setPlayedAt(e.target.value)}
              />
            )}
          </div>
        )}
      </Card>

      {error && <Banner tone="error">{error}</Banner>}

      <Button type="submit" size="lg" full disabled={loading}>
        {loading
          ? 'Starting…'
          : isOfficial
            ? scheduleAhead
              ? 'Schedule tournament'
              : 'Start official tournament'
            : backdate
              ? 'Open the ledger'
              : kind === 'cash'
                ? 'Start game'
                : 'Start tournament'}
      </Button>
      {!backdate && !isOfficial && (
        <p className="text-center text-xs text-zinc-500">
          The session is saved as soon as you start — closing the tab or refreshing won’t lose anything.
        </p>
      )}
    </form>
  )
}
