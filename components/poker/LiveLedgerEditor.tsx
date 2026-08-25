'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import Banner from '@/components/ui/Banner'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import ChipSelect from '@/components/ui/ChipSelect'
import ConfirmStrip from '@/components/ui/ConfirmStrip'
import DollarInput from '@/components/ui/DollarInput'
import GameIcon from '@/components/ui/GameIcon'
import Icon from '@/components/ui/Icon'
import IconTile from '@/components/ui/IconTile'
import PageHeader from '@/components/ui/PageHeader'
import PokerStatusBadge from '@/components/ui/PokerStatusBadge'
import SectionHeader from '@/components/ui/SectionHeader'
import TextLink from '@/components/ui/TextLink'
import LedgerFooter from './LedgerFooter'
import LedgerRowEditor, { type RowState } from './LedgerRowEditor'
import PlayerPicker from './PlayerPicker'
import { DURATION_PRESETS_MINUTES, STAKES_PRESETS, VARIANT_OPTIONS } from '@/lib/poker/constants'
import { formatCents, formatDuration } from '@/lib/poker/money'
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '@/lib/poker/periods'
import { computeTotals, sessionTitle } from '@/lib/poker/stats'
import type { SessionFull } from '@/lib/poker/queries'
import type { PlayerRefWithHouse, PokerSessionKind } from '@/lib/poker/types'

interface LiveLedgerEditorProps {
  session: SessionFull
  currentUserId: string
  players: PlayerRefWithHouse[]
  recent: PlayerRefWithHouse[]
  /** live = autosave + "End & log"; edit = explicit save of a finalized session */
  mode: 'live' | 'edit'
}

interface EditorState {
  title: string
  stakes: string | null
  variant: string | null
  location: string
  notes: string
  standardBuyIn: number | null
  prizePool: number | null
  playedAt: string // datetime-local value
  durationMinutes: number | null
  rows: RowState[]
}

type SaveStatus = 'saved' | 'saving' | 'error' | 'idle'

function rowsFromSession(session: SessionFull): RowState[] {
  return session.entries
    .filter((e) => e.user != null)
    .map((e) => ({
      key: e.id,
      user: e.user!,
      buyInCents: e.buy_in_cents,
      cashOutCents: e.cash_out_cents,
      rebuys: e.rebuy_count,
      place: e.finish_place,
      buyInTouched: true,
    }))
}

function stateFromSession(session: SessionFull): EditorState {
  return {
    title: session.title ?? '',
    stakes: session.stakes,
    variant: session.variant,
    location: session.location ?? '',
    notes: session.notes ?? '',
    standardBuyIn: session.standard_buy_in_cents,
    prizePool: session.prize_pool_cents,
    playedAt: toDateTimeLocalValue(new Date(session.played_at)),
    durationMinutes: session.duration_minutes,
    rows: rowsFromSession(session),
  }
}

function buildPayload(sessionId: string, version: number, kind: PokerSessionKind, s: EditorState) {
  return {
    session_id: sessionId,
    version,
    title: s.title.trim() || null,
    stakes: kind === 'cash' ? s.stakes : null,
    variant: s.variant,
    location: s.location.trim() || null,
    notes: s.notes.trim() || null,
    standard_buy_in_cents: s.standardBuyIn,
    prize_pool_cents: kind === 'tournament' ? s.prizePool : null,
    played_at: fromDateTimeLocalValue(s.playedAt),
    duration_minutes: s.durationMinutes,
    entries: s.rows.map((r) => ({
      user_id: r.user.id,
      buy_in_cents: r.buyInCents,
      cash_out_cents: kind === 'tournament' ? (r.cashOutCents ?? 0) : r.cashOutCents,
      rebuy_count: r.rebuys,
      finish_place: kind === 'tournament' ? r.place : null,
    })),
  }
}

function ledgerProblems(kind: PokerSessionKind, s: EditorState): { hard: string[]; soft: string[] } {
  const hard: string[] = []
  const soft: string[] = []
  const rows = s.rows
  if (rows.length < 2) hard.push('Add at least 2 players.')
  if (kind === 'cash') {
    const missing = rows.filter((r) => r.cashOutCents == null)
    if (missing.length > 0) {
      hard.push(
        `${missing.length === 1 ? `${missing[0].user.display_name} needs` : `${missing.length} players need`} a cash-out. Enter 0 for anyone who busted.`
      )
    }
    if (rows.length > 0 && rows.every((r) => r.buyInCents === 0)) hard.push('Enter at least one buy-in.')
  } else {
    const places = rows.map((r) => r.place).filter((p): p is number => p != null)
    const dup = places.find((p, i) => places.indexOf(p) !== i)
    if (dup != null) hard.push(`Two players cannot both finish ${dup}${dup === 1 ? 'st' : dup === 2 ? 'nd' : dup === 3 ? 'rd' : 'th'}.`)
    if (places.some((p) => p > rows.length)) hard.push('A finishing place is higher than the number of players.')
    for (const r of rows) {
      if ((r.cashOutCents ?? 0) > 0 && r.place == null) hard.push(`${r.user.display_name} has a payout but no finishing place.`)
    }
    if (rows.length > 0 && rows.length < 4) soft.push('Tournaments usually have more than 3 players. Did you mean a cash game?')
  }
  const played = fromDateTimeLocalValue(s.playedAt)
  if (!played) hard.push('Enter a valid session date.')
  else if (new Date(played).getTime() > Date.now() + 60 * 60 * 1000) hard.push('The session date cannot be in the future.')

  const totals = computeTotals(
    rows.map((r) => ({ buy_in_cents: r.buyInCents, cash_out_cents: r.cashOutCents })),
    kind === 'tournament' ? s.prizePool : null
  )
  if (totals.missingCashOuts === 0 && totals.discrepancy !== 0 && rows.length > 0) {
    const amt = formatCents(Math.abs(totals.discrepancy), { compact: true })
    if (kind === 'cash') {
      soft.push(
        totals.discrepancy > 0
          ? `Cash-outs exceed buy-ins by ${amt}. The table cannot create money; double-check a stack. You can still log it and the discrepancy is recorded.`
          : `Cash-outs are ${amt} short of buy-ins. Someone’s cash-out may be missing. You can still log it and the discrepancy is recorded.`
      )
    } else {
      soft.push(
        totals.discrepancy > 0
          ? `Payouts exceed the ${s.prizePool != null ? 'prize pool' : 'total entries'} by ${amt} (added money?). You can still log it.`
          : `${amt} of the ${s.prizePool != null ? 'prize pool' : 'entries'} is not paid out yet. You can still log it.`
      )
    }
  }
  return { hard, soft }
}

export default function LiveLedgerEditor({ session, currentUserId, players, recent, mode }: LiveLedgerEditorProps) {
  const router = useRouter()
  const kind = session.kind
  const [state, setState] = useState<EditorState>(() => stateFromSession(session))
  const [version, setVersion] = useState(session.version)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirming, setConfirming] = useState<'finalize' | 'void' | 'save' | null>(null)
  const [busy, setBusy] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(mode === 'edit')
  const [finalDuration, setFinalDuration] = useState<number | null>(session.duration_minutes)

  const dirtyRef = useRef(false)
  const inFlightRef = useRef(false)
  const queuedRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stateRef = useRef(state)
  const versionRef = useRef(version)
  stateRef.current = state
  versionRef.current = version

  const selectedIds = useMemo(() => new Set(state.rows.map((r) => r.user.id)), [state.rows])
  const totals = useMemo(
    () =>
      computeTotals(
        state.rows.map((r) => ({ buy_in_cents: r.buyInCents, cash_out_cents: r.cashOutCents })),
        kind === 'tournament' ? state.prizePool : null
      ),
    [state.rows, state.prizePool, kind]
  )
  const problems = useMemo(() => ledgerProblems(kind, state), [kind, state])

  // ---- autosave (live mode only) -------------------------------------------
  const saveNow = useCallback(async () => {
    if (mode !== 'live') return
    if (inFlightRef.current) {
      queuedRef.current = true
      return
    }
    inFlightRef.current = true
    setSaveStatus('saving')
    try {
      const res = await fetch('/api/poker/sessions/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(session.id, versionRef.current, kind, stateRef.current)),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 409 && /another device|reload/i.test(data.error ?? '')) {
          setNotice('This session was updated from another device. Reloading the latest ledger.')
          router.refresh()
          setSaveStatus('idle')
          return
        }
        throw new Error(data.error || 'Save failed')
      }
      if (data.session?.version) setVersion(data.session.version)
      dirtyRef.current = false
      setSaveStatus('saved')
      setError('')
    } catch (err: any) {
      setSaveStatus('error')
      setError(err?.message?.includes('fetch') ? 'Offline. Will retry.' : err?.message || 'Save failed')
      timerRef.current = setTimeout(() => void saveNow(), 4000)
    } finally {
      inFlightRef.current = false
      if (queuedRef.current) {
        queuedRef.current = false
        void saveNow()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, session.id, kind])

  const scheduleSave = useCallback(() => {
    if (mode !== 'live') return
    dirtyRef.current = true
    setSaveStatus('saving')
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => void saveNow(), 600)
  }, [mode, saveNow])

  const update = useCallback(
    (patch: Partial<EditorState> | ((prev: EditorState) => Partial<EditorState>)) => {
      setState((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }))
      scheduleSave()
    },
    [scheduleSave]
  )

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (mode === 'live' ? dirtyRef.current || inFlightRef.current : dirtyRef.current) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [mode])

  useEffect(() => {
    if (mode !== 'live') return
    const supabase = createClient()
    const channel = supabase
      .channel(`poker-session-host:${session.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'poker_sessions', filter: `id=eq.${session.id}` },
        (payload) => {
          const next = payload.new as { version?: number; status?: string }
          if (next.status && next.status !== 'live') {
            router.refresh()
            return
          }
          if (next.version != null && next.version > versionRef.current && !inFlightRef.current && !dirtyRef.current) {
            setNotice('Updated from another device.')
            router.refresh()
          }
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [mode, session.id, router])

  useEffect(() => {
    if (session.version > versionRef.current && !dirtyRef.current && !inFlightRef.current) {
      setState(stateFromSession(session))
      setVersion(session.version)
      setSaveStatus('saved')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.version])

  // ---- row helpers ----------------------------------------------------------
  const addPlayer = (p: PlayerRefWithHouse) => {
    if (selectedIds.has(p.id)) return
    update((prev) => ({
      rows: [
        ...prev.rows,
        {
          key: `new:${p.id}`,
          user: p,
          buyInCents: prev.standardBuyIn ?? 0,
          cashOutCents: kind === 'tournament' ? 0 : null,
          rebuys: 0,
          place: null,
          buyInTouched: false,
        },
      ],
    }))
  }

  const patchRow = (key: string, patch: Partial<RowState>) =>
    update((prev) => ({ rows: prev.rows.map((r) => (r.key === key ? { ...r, ...patch } : r)) }))

  const removeRow = (key: string) => update((prev) => ({ rows: prev.rows.filter((r) => r.key !== key) }))

  const quickBuyIn = (key: string) =>
    update((prev) => ({
      rows: prev.rows.map((r) =>
        r.key === key ? { ...r, buyInCents: r.buyInCents + (prev.standardBuyIn ?? 0), rebuys: r.rebuys + 1, buyInTouched: true } : r
      ),
    }))

  const bustOut = (key: string) =>
    update((prev) => {
      const taken = new Set(prev.rows.map((r) => r.place).filter((p): p is number => p != null))
      let place: number | null = null
      for (let p = prev.rows.length; p >= 1; p--) {
        if (!taken.has(p)) {
          place = p
          break
        }
      }
      return { rows: prev.rows.map((r) => (r.key === key ? { ...r, place } : r)) }
    })

  const setRebuys = (key: string, n: number) =>
    update((prev) => ({
      rows: prev.rows.map((r) => {
        if (r.key !== key) return r
        const derived = kind === 'tournament' && !r.buyInTouched && prev.standardBuyIn != null
        return { ...r, rebuys: n, buyInCents: derived ? prev.standardBuyIn! * (1 + n) : r.buyInCents }
      }),
    }))

  const numberByOrder = () => update((prev) => ({ rows: prev.rows.map((r, i) => ({ ...r, place: i + 1 })) }))
  const sortByPlace = () => update((prev) => ({ rows: [...prev.rows].sort((a, b) => (a.place ?? 999) - (b.place ?? 999)) }))

  // ---- primary actions ------------------------------------------------------
  const callApi = async (endpoint: string, body: unknown, onOk: (data: any) => void) => {
    setBusy(true)
    setError('')
    try {
      if (mode === 'live' && timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      onOk(data)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
      setBusy(false)
      setConfirming(null)
    }
  }

  const finalize = () => {
    const payload = { ...buildPayload(session.id, version, kind, state), duration_minutes: finalDuration }
    void callApi('/api/poker/sessions/finalize', payload, () => {
      dirtyRef.current = false
      router.refresh()
    })
  }

  const saveEdits = () => {
    const payload = buildPayload(session.id, version, kind, state)
    void callApi('/api/poker/sessions/update', payload, () => {
      dirtyRef.current = false
      router.push(`/poker/sessions/${session.id}`)
      router.refresh()
    })
  }

  const voidSession = () =>
    void callApi('/api/poker/sessions/void', { session_id: session.id }, () => {
      dirtyRef.current = false
      router.refresh()
    })

  useEffect(() => {
    if (mode === 'edit') dirtyRef.current = true
  }, [state, mode])

  const isTourney = kind === 'tournament'
  const title = sessionTitle({ ...session, title: state.title || null, stakes: state.stakes, variant: state.variant })
  const columns = isTourney
    ? 'sm:grid-cols-[minmax(0,1fr)_7rem_6.5rem_6rem_7rem_5rem_2rem]'
    : 'sm:grid-cols-[minmax(0,1fr)_7rem_7.5rem_7rem_5rem_2rem]'

  const saveLabel =
    saveStatus === 'saved' ? (
      <span className="inline-flex items-center gap-1 text-win">
        <Icon name="check" className="h-3 w-3" strokeWidth={2.5} /> Saved
      </span>
    ) : saveStatus === 'saving' ? (
      <span className="text-zinc-400">Saving…</span>
    ) : saveStatus === 'error' ? (
      <span className="text-warn">Not saved. Retrying</span>
    ) : (
      <span className="text-zinc-500">Autosaves as you go</span>
    )

  return (
    <div className="space-y-5 pb-4">
      <PageHeader
        size="md"
        leading={<IconTile icon={<GameIcon game="poker" />} />}
        title={title}
        meta={
          <>
            <TextLink href="/poker" muted className="text-xs">
              Poker
            </TextLink>
            <span>· {isTourney ? 'Tournament' : 'Cash game'}</span>
            {session.started_at && mode === 'live' && (
              <span>· started {new Date(session.started_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
            )}
            {mode === 'live' && <span>· {saveLabel}</span>}
          </>
        }
        actions={
          <>
            <PokerStatusBadge status={mode === 'live' ? 'live' : session.status} acked={session.ack_count} total={session.player_count} />
            {mode === 'live' && confirming !== 'void' && (
              <Button size="sm" variant="ghost" onClick={() => setConfirming('void')} disabled={busy} type="button">
                Void
              </Button>
            )}
          </>
        }
      />

      {mode === 'edit' && <Banner tone="warning">Saving changes resets everyone’s confirmations and re-sends the ledger to their inbox.</Banner>}
      {notice && (
        <Banner
          tone="info"
          action={
            <button type="button" className="text-xs underline" onClick={() => setNotice('')}>
              Dismiss
            </button>
          }
        >
          {notice}
        </Banner>
      )}
      {error && <Banner tone="error">{error}</Banner>}

      {confirming === 'void' && (
        <ConfirmStrip
          text="Void this session? It will not count anywhere and cannot be reopened."
          tone="danger"
          busy={busy}
          busyLabel="Voiding…"
          confirmLabel="Void session"
          onConfirm={voidSession}
          onBack={() => setConfirming(null)}
          className="mt-0"
        />
      )}

      <Card padding="sm">
        <button type="button" className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setDetailsOpen((o) => !o)} aria-expanded={detailsOpen}>
          <span className="text-sm font-semibold text-white">Table details</span>
          <span className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="truncate">{[state.stakes, state.variant, state.location.trim() || null].filter(Boolean).join(' · ') || 'Add stakes, variant, location'}</span>
            <Icon name="chevron-down" className={cn('h-4 w-4 transition', detailsOpen && 'rotate-180')} />
          </span>
        </button>
        {detailsOpen && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="session-title" className="label">
                Title <span className="font-normal text-zinc-500">(optional)</span>
              </label>
              <input
                id="session-title"
                type="text"
                className="input"
                placeholder={sessionTitle({ ...session, title: null, stakes: state.stakes, variant: state.variant })}
                value={state.title}
                maxLength={80}
                onChange={(e) => update({ title: e.target.value })}
              />
            </div>
            {!isTourney && (
              <div className="sm:col-span-2">
                <p className="label">Stakes</p>
                <ChipSelect options={STAKES_PRESETS.map((s) => ({ value: s, label: s }))} value={state.stakes} onChange={(v) => update({ stakes: v })} allowCustom size="sm" aria-label="Stakes" />
              </div>
            )}
            <div className="sm:col-span-2">
              <p className="label">Variant</p>
              <ChipSelect options={VARIANT_OPTIONS.map((v) => ({ value: v, label: v }))} value={state.variant} onChange={(v) => update({ variant: v })} size="sm" aria-label="Variant" />
            </div>
            <div>
              <label className="label" htmlFor="std-buy-in">
                {isTourney ? 'Entry fee' : 'Standard buy-in'}
              </label>
              <DollarInput
                id="std-buy-in"
                valueCents={state.standardBuyIn}
                onChange={(c) =>
                  update((prev) => ({
                    standardBuyIn: c,
                    rows: isTourney ? prev.rows.map((r) => (r.buyInTouched || c == null ? r : { ...r, buyInCents: c * (1 + r.rebuys) })) : prev.rows,
                  }))
                }
                size="sm"
                chain={false}
                disabled={session.is_official}
              />
            </div>
            {isTourney && (
              <div>
                <label className="label" htmlFor="prize-pool">
                  Prize pool <span className="font-normal text-zinc-500">(if not just the entries)</span>
                </label>
                <DollarInput id="prize-pool" valueCents={state.prizePool} onChange={(c) => update({ prizePool: c })} size="sm" chain={false} placeholder="= entries" />
              </div>
            )}
            <div>
              <label htmlFor="location" className="label">
                Location
              </label>
              <input id="location" type="text" className="input" value={state.location} maxLength={80} onChange={(e) => update({ location: e.target.value })} />
            </div>
            <div>
              <label htmlFor="played-at" className="label">
                Played
              </label>
              <input id="played-at" type="datetime-local" className="input" value={state.playedAt} max={toDateTimeLocalValue(new Date())} onChange={(e) => update({ playedAt: e.target.value })} />
            </div>
            {mode === 'edit' && (
              <div>
                <p className="label">Duration</p>
                <ChipSelect
                  options={DURATION_PRESETS_MINUTES.map((m) => ({ value: String(m), label: formatDuration(m) }))}
                  value={state.durationMinutes != null ? String(state.durationMinutes) : null}
                  onChange={(v) => update({ durationMinutes: v != null && /^\d+$/.test(v) ? Number(v) : null })}
                  size="sm"
                  aria-label="Duration"
                />
              </div>
            )}
            <div className="sm:col-span-2">
              <label htmlFor="notes" className="label">
                Notes
              </label>
              <textarea id="notes" className="input min-h-[72px]" value={state.notes} maxLength={1000} onChange={(e) => update({ notes: e.target.value })} />
            </div>
          </div>
        )}
      </Card>

      <div>
        <SectionHeader title="Players" />
        <PlayerPicker players={players} recent={recent} selectedIds={selectedIds} onAdd={addPlayer} disabled={busy} />
      </div>

      <div>
        <SectionHeader
          title="Ledger"
          aside={
            isTourney && state.rows.length > 1 ? (
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={numberByOrder} type="button" disabled={busy}>
                  Number by row order
                </Button>
                <Button size="sm" variant="secondary" onClick={sortByPlace} type="button" disabled={busy}>
                  Sort by place
                </Button>
              </div>
            ) : undefined
          }
        />
        <Card padding="none" className="overflow-hidden">
          {state.rows.length === 0 ? (
            <p className="p-6 text-center text-sm text-zinc-500">Add players above to start the ledger.</p>
          ) : (
            <>
              <div className={cn('eyebrow hidden px-4 py-2 sm:grid', columns)}>
                <span>Player</span>
                <span>{isTourney ? 'Buy-in' : 'Buy-in (total)'}</span>
                <span>Rebuys</span>
                {isTourney && <span>Place</span>}
                <span>{isTourney ? 'Payout' : 'Cash-out'}</span>
                <span className="text-right">Net</span>
                <span />
              </div>
              <div className="divide-y divide-line">
                {state.rows.map((row) => (
                  <LedgerRowEditor
                    key={row.key}
                    row={row}
                    kind={kind}
                    playerCount={state.rows.length}
                    currentUserId={currentUserId}
                    standardBuyIn={state.standardBuyIn}
                    disabled={busy}
                    onChange={(patch) => {
                      if (patch.rebuys != null && Object.keys(patch).length === 1) setRebuys(row.key, patch.rebuys)
                      else patchRow(row.key, patch)
                    }}
                    onRemove={() => removeRow(row.key)}
                    onQuickBuyIn={() => quickBuyIn(row.key)}
                    onBustOut={() => bustOut(row.key)}
                  />
                ))}
              </div>
            </>
          )}
        </Card>
        {!isTourney && (
          <p className="mt-2 text-xs text-zinc-500">
            Buy-in is each player’s total for the night. Use the +{state.standardBuyIn ? formatCents(state.standardBuyIn, { compact: true }) : 'buy-in'} button when someone reloads.
          </p>
        )}
      </div>

      <LedgerFooter
        kind={kind}
        totals={totals}
        playerCount={state.rows.length}
        prizePoolCents={isTourney ? state.prizePool : null}
        hardErrors={problems.hard}
        softWarnings={problems.soft}
        primaryLabel={mode === 'live' ? 'End & log session' : 'Save changes'}
        busy={busy}
        confirming={confirming === 'finalize' || confirming === 'save'}
        confirmText={
          mode === 'live' ? (
            <>
              Log this session with <strong>{state.rows.length}</strong> players, {formatCents(totals.buyIn, { compact: true })} in and {formatCents(totals.cashOut, { compact: true })} out?
              Everyone will be asked to confirm their line.
            </>
          ) : (
            <>Save these changes? All confirmations will be reset and players re-notified.</>
          )
        }
        confirmExtra={
          mode === 'live' ? (
            <div>
              <p className="eyebrow mb-1.5">Duration {session.started_at && '(auto from start time if left blank)'}</p>
              <ChipSelect
                options={DURATION_PRESETS_MINUTES.map((m) => ({ value: String(m), label: formatDuration(m) }))}
                value={finalDuration != null ? String(finalDuration) : null}
                onChange={(v) => setFinalDuration(v != null && /^\d+$/.test(v) ? Number(v) : null)}
                size="sm"
                aria-label="Duration"
              />
            </div>
          ) : undefined
        }
        onPrimary={() => setConfirming(mode === 'live' ? 'finalize' : 'save')}
        onConfirm={mode === 'live' ? finalize : saveEdits}
        onBack={() => setConfirming(null)}
      />
    </div>
  )
}
