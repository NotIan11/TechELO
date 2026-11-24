'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import Banner from '@/components/ui/Banner'
import Button from '@/components/ui/Button'
import ChipSelect from '@/components/ui/ChipSelect'
import ConfirmStrip from '@/components/ui/ConfirmStrip'
import DollarInput from '@/components/ui/DollarInput'
import Icon from '@/components/ui/Icon'
import MoneyDelta from '@/components/ui/MoneyDelta'
import TextLink from '@/components/ui/TextLink'
import LedgerFooter from './LedgerFooter'
import LedgerRowEditor, { type RowState } from './LedgerRowEditor'
import PlayerPicker from './PlayerPicker'
import Sheet from './Sheet'
import { DURATION_PRESETS_MINUTES, STAKES_PRESETS, VARIANT_OPTIONS } from '@/lib/poker/constants'
import { guestAsPlayer } from '@/lib/poker/guests'
import { formatCents, formatDuration, ordinal } from '@/lib/poker/money'
import { TIME_ZONE, fromDateTimeLocalValue, toDateTimeLocalValue } from '@/lib/poker/periods'
import { plural } from '@/lib/poker/phrases'
import { computeTotals, sessionTitle } from '@/lib/poker/stats'
import type { SessionFull } from '@/lib/poker/queries'
import type { GuestRef, PlayerRefWithHouse, PokerGuestRow, PokerSessionKind } from '@/lib/poker/types'

interface LiveLedgerEditorProps {
  session: SessionFull
  currentUserId: string
  players: PlayerRefWithHouse[]
  /** Guests without an account yet, offered by the picker */
  guests: GuestRef[]
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
      guestId: e.guest_id,
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
      // A guest row sends its guest id; the server resolves a linked guest to the account.
      user_id: r.user.guest ? null : r.user.id,
      guest_id: r.user.guest ? r.user.id : r.guestId,
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

export default function LiveLedgerEditor({ session, currentUserId, players, guests, recent, mode }: LiveLedgerEditorProps) {
  const router = useRouter()
  const kind = session.kind
  const [state, setState] = useState<EditorState>(() => stateFromSession(session))
  const [guestList, setGuestList] = useState<GuestRef[]>(guests)
  const [version, setVersion] = useState(session.version)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirming, setConfirming] = useState<'finalize' | 'void' | 'save' | null>(null)
  const [busy, setBusy] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(mode === 'edit')
  const [finalDuration, setFinalDuration] = useState<number | null>(session.duration_minutes)
  /** Row whose editor (sheet / inline panel) is open */
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  /** Display order captured when a row's editor opens, so the row does not jump as it settles */
  const [frozenOrder, setFrozenOrder] = useState<string[]>([])

  const dirtyRef = useRef(false)
  const inFlightRef = useRef(false)
  const queuedRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stateRef = useRef(state)
  const versionRef = useRef(version)
  stateRef.current = state
  versionRef.current = version

  const selectedIds = useMemo(() => new Set(state.rows.map((r) => r.user.id)), [state.rows])
  const guestRows = useMemo(() => state.rows.filter((r) => r.user.guest).length, [state.rows])
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
          guestId: p.guest ? p.id : null,
          buyInCents: prev.standardBuyIn ?? 0,
          cashOutCents: kind === 'tournament' ? 0 : null,
          rebuys: 0,
          place: null,
          buyInTouched: false,
        },
      ],
    }))
  }

  /** Create a guest row on the server, then seat them like any other player */
  const addGuest = async (name: string): Promise<boolean> => {
    setError('')
    try {
      const res = await fetch('/api/poker/guests/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not add guest')
      const g = data.guest as PokerGuestRow
      const ref: GuestRef = { id: g.id, name: g.name, created_by: g.created_by, added_by: null, linked_user_id: null }
      setGuestList((prev) => (prev.some((x) => x.id === ref.id) ? prev : [...prev, ref]))
      addPlayer(guestAsPlayer(ref))
      return true
    } catch (err: any) {
      setError(err?.message || 'Could not add guest')
      return false
    }
  }

  const patchRow = (key: string, patch: Partial<RowState>) =>
    update((prev) => ({ rows: prev.rows.map((r) => (r.key === key ? { ...r, ...patch } : r)) }))

  const removeRow = (key: string) => update((prev) => ({ rows: prev.rows.filter((r) => r.key !== key) }))

  /** Add `cents` to a player's total buy-in as one reload (the one-tap "+ buy-in" and its 2× / custom variants) */
  const reload = (key: string, cents: number) =>
    update((prev) => ({
      rows: prev.rows.map((r) => (r.key === key ? { ...r, buyInCents: r.buyInCents + cents, rebuys: r.rebuys + 1, buyInTouched: true } : r)),
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
  const isLive = mode === 'live'

  // ---- derived display state ------------------------------------------------
  const isSettled = (r: RowState) => (isTourney ? r.place != null : r.cashOutCents != null)
  // Live cash games sink settled players to the bottom. Tournament order is the host's own (it drives "Number by row order").
  const sinks = isLive && !isTourney
  const displayRows = useMemo(() => {
    if (!sinks) return state.rows
    if (openKey == null) {
      const settled = (r: RowState) => r.cashOutCents != null
      return [...state.rows.filter((r) => !settled(r)), ...state.rows.filter(settled)]
    }
    const byKey = new Map(state.rows.map((r) => [r.key, r]))
    const kept = frozenOrder.map((k) => byKey.get(k)).filter((r): r is RowState => r != null)
    const added = state.rows.filter((r) => !frozenOrder.includes(r.key))
    return [...kept, ...added]
  }, [state.rows, openKey, sinks, frozenOrder])
  const toggleRow = (key: string) => {
    if (openKey === key) {
      setOpenKey(null)
      return
    }
    setFrozenOrder(displayRows.map((r) => r.key))
    setOpenKey(key)
  }

  const stillIn = state.rows.filter((r) => !isSettled(r)).length
  const onTable = totals.buyIn - totals.cashOut
  const balanced = totals.discrepancy === 0 && totals.missingCashOuts === 0
  const balanceWord =
    state.rows.length === 0 ? null : balanced ? (
      <span className="font-sans text-win">Balanced</span>
    ) : totals.missingCashOuts > 0 && !isTourney ? null : (
      <span className="font-sans text-warn">
        Off by <span className="tabular">{formatCents(Math.abs(totals.discrepancy), { compact: true })}</span>
      </span>
    )
  const startedAt = session.started_at
    ? new Date(session.started_at).toLocaleTimeString('en-US', { timeZone: TIME_ZONE, hour: 'numeric', minute: '2-digit' })
    : null
  const subline = [
    isTourney
      ? state.standardBuyIn != null
        ? state.standardBuyIn === 0
          ? 'Free entry'
          : `${formatCents(state.standardBuyIn, { compact: true })} entry`
        : 'Tournament'
      : state.stakes,
    state.variant,
    state.location.trim() || null,
    isLive && startedAt ? `started ${startedAt}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const saveText = saveStatus === 'saved' ? 'saved' : saveStatus === 'saving' ? 'saving…' : saveStatus === 'error' ? 'not saved, retrying' : 'autosaves as you go'

  const figureLabel = !isLive ? (isTourney && state.prizePool != null ? 'Prize pool' : 'Money in') : isTourney ? 'In the prize pool' : 'On the table'
  const figureValue = !isLive || isTourney ? (isTourney && state.prizePool != null ? state.prizePool : totals.buyIn) : onTable

  return (
    <div className="mx-auto max-w-3xl pb-28 lg:pb-0">
      {/* Top bar: back, save state, void */}
      <div className="-mt-4 flex items-center justify-between sm:-mt-6">
        <Link
          href={isLive ? '/poker' : `/poker/sessions/${session.id}`}
          aria-label={isLive ? 'Back to poker' : 'Back to the session'}
          className="-ml-3 inline-flex h-11 w-11 items-center justify-center text-zinc-300 transition hover:text-white"
        >
          <Icon name="chevron-left" className="h-5 w-5" />
        </Link>
        {isLive ? (
          <span role="status" aria-live="polite" className={cn('inline-flex items-center gap-1.5 text-xs', saveStatus === 'error' ? 'text-warn' : 'text-loss')}>
            <span className={cn('h-1.5 w-1.5 rounded-full', saveStatus === 'error' ? 'bg-warn' : 'bg-loss')} />
            Live · {saveText}
          </span>
        ) : (
          <span className="text-xs text-mute">Editing a logged {isTourney ? 'tournament' : 'night'}</span>
        )}
        {isLive && confirming !== 'void' ? (
          <button
            type="button"
            onClick={() => setConfirming('void')}
            disabled={busy}
            className="-mr-2 inline-flex h-11 items-center px-2 text-[13px] text-mute transition hover:text-loss disabled:opacity-50"
          >
            Void
          </button>
        ) : (
          <span className="w-11" aria-hidden="true" />
        )}
      </div>

      <div className="pb-5 pt-2">
        <h1 className="font-display text-2xl tracking-tight text-white sm:text-[32px]">{title}</h1>
        {subline && <p className="mt-1 text-[13px] text-mute">{subline}</p>}
        <p className="mt-[22px] text-[13px] text-mute">{figureLabel}</p>
        <p className="tabular mt-0.5 text-[56px] leading-none tracking-tighter text-white">{formatCents(figureValue)}</p>
        <p className="tabular mt-2.5 flex flex-wrap gap-x-1.5 text-[13px] text-zinc-400">
          {isTourney ? (
            <>
              <span>entries {formatCents(totals.buyIn)}</span>
              <span>· paid out {formatCents(totals.cashOut)}</span>
              <span>
                · {isLive ? `${stillIn} of ${state.rows.length} still in` : `${state.rows.length} ${plural(state.rows.length, 'player')}`}
              </span>
            </>
          ) : (
            <>
              <span>in {formatCents(totals.buyIn)}</span>
              <span>· out {formatCents(totals.cashOut)}</span>
              <span>· {isLive || totals.missingCashOuts > 0 ? `${stillIn} playing` : `${state.rows.length} ${plural(state.rows.length, 'player')}`}</span>
            </>
          )}
          {balanceWord && <span>· {balanceWord}</span>}
        </p>
      </div>

      {(mode === 'edit' || notice || error || confirming === 'void') && (
        <div className="space-y-2 pb-5">
          {mode === 'edit' && <Banner tone="warning">Saving changes resets everyone’s confirmations and re-sends the ledger to their inbox.</Banner>}
          {notice && (
            <Banner
              tone="info"
              action={
                <button type="button" className="min-h-[44px] px-1 text-xs underline underline-offset-4" onClick={() => setNotice('')}>
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
        </div>
      )}

      {/* Table details, collapsed behind one quiet row */}
      <div className="border-t border-line">
        <button
          type="button"
          className="flex min-h-[52px] w-full items-center justify-between gap-3 text-left"
          onClick={() => setDetailsOpen((o) => !o)}
          aria-expanded={detailsOpen}
        >
          <span className="text-sm text-white">Table details</span>
          <span className="flex min-w-0 items-center gap-2 text-xs text-mute">
            <span className="truncate">{[state.stakes, state.variant, state.location.trim() || null].filter(Boolean).join(' · ') || 'Add stakes, variant, location'}</span>
            <Icon name="chevron-down" className={cn('h-4 w-4 shrink-0 transition', detailsOpen && 'rotate-180')} />
          </span>
        </button>
        {detailsOpen && (
          <div className="grid gap-5 pb-6 pt-2 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="session-title" className="label">
                Title, if you want one
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
                <ChipSelect
                  options={STAKES_PRESETS.map((s) => ({ value: s, label: s }))}
                  value={state.stakes}
                  onChange={(v) => update({ stakes: v })}
                  allowCustom
                  aria-label="Stakes"
                  className="tabular"
                />
              </div>
            )}
            <div className="sm:col-span-2">
              <p className="label">Variant</p>
              <ChipSelect options={VARIANT_OPTIONS.map((v) => ({ value: v, label: v }))} value={state.variant} onChange={(v) => update({ variant: v })} aria-label="Variant" />
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
                chain={false}
                disabled={session.is_official}
                className="[&_input]:tabular"
              />
            </div>
            {isTourney && (
              <div>
                <label className="label" htmlFor="prize-pool">
                  Prize pool, if not just the entries
                </label>
                <DollarInput id="prize-pool" valueCents={state.prizePool} onChange={(c) => update({ prizePool: c })} chain={false} placeholder="= entries" className="[&_input]:tabular" />
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
              <input
                id="played-at"
                type="datetime-local"
                className="input tabular"
                value={state.playedAt}
                max={toDateTimeLocalValue(new Date())}
                onChange={(e) => update({ playedAt: e.target.value })}
              />
            </div>
            {mode === 'edit' && (
              <div className="sm:col-span-2">
                <p className="label">Duration</p>
                <ChipSelect
                  options={DURATION_PRESETS_MINUTES.map((m) => ({ value: String(m), label: formatDuration(m) }))}
                  value={state.durationMinutes != null ? String(state.durationMinutes) : null}
                  onChange={(v) => update({ durationMinutes: v != null && /^\d+$/.test(v) ? Number(v) : null })}
                  aria-label="Duration"
                  className="tabular"
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
      </div>

      {/* Warnings that do not block logging */}
      {problems.soft.length > 0 && confirming !== 'finalize' && confirming !== 'save' && (
        <div className="space-y-2 border-t border-line py-4">
          {problems.soft.map((w) => (
            <Banner key={w} tone="warning" compact>
              {w}
            </Banner>
          ))}
        </div>
      )}

      {/* Add players: full-screen sheet on a phone, inline panel on wide screens */}
      {pickerOpen && (
        <Sheet
          label="Add players"
          placement="full"
          onClose={() => setPickerOpen(false)}
          header={
            <>
              <h2 className="font-display text-2xl tracking-tight text-white">Add players</h2>
              <p className="tabular mt-1 text-[13px] text-zinc-400">
                {state.rows.length} seated
              </p>
            </>
          }
        >
          <div className="mt-5 lg:max-w-xl">
            <PlayerPicker players={players} guests={guestList} recent={recent} selectedIds={selectedIds} onAdd={addPlayer} onAddGuest={addGuest} disabled={busy} />
            {error && (
              <Banner tone="error" className="mt-4 lg:hidden">
                {error}
              </Banner>
            )}
            <Button type="button" variant="outline" full onClick={() => setPickerOpen(false)} className="mt-6 min-h-[52px] text-[15px] lg:w-auto lg:px-8">
              Done
            </Button>
          </div>
        </Sheet>
      )}

      {/* Players */}
      <div className="border-t border-line-bright">
        {isTourney && state.rows.length > 1 && (
          <div className="flex flex-wrap items-center gap-x-5 border-b border-line">
            <span className="text-xs text-mute">Places</span>
            <button type="button" onClick={numberByOrder} disabled={busy} className="link min-h-[44px] text-[13px] disabled:opacity-50">
              Number by row order
            </button>
            <button type="button" onClick={sortByPlace} disabled={busy} className="link min-h-[44px] text-[13px] disabled:opacity-50">
              Sort by place
            </button>
          </div>
        )}
        {state.rows.length === 0 ? (
          <p className="border-b border-line py-6 text-sm text-mute">
            Nobody is seated yet.{' '}
            <TextLink onClick={() => setPickerOpen(true)} className="text-sm">
              Add the first player
            </TextLink>
          </p>
        ) : (
          displayRows.map((row) => {
            const open = row.key === openKey
            const settled = isSettled(row)
            const net = (row.cashOutCents ?? 0) - row.buyInCents
            return (
              <div key={row.key}>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => toggleRow(row.key)}
                  className={cn(
                    'flex min-h-[62px] w-full items-center gap-3 border-b border-line py-2 text-left transition hover:border-line-bright',
                    isLive && settled && !open && 'opacity-60'
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="truncate text-base text-white">{row.user.display_name}</span>
                      {row.user.id === currentUserId && <span className="shrink-0 text-xs text-orange-400">you</span>}
                      {row.user.guest && <span className="shrink-0 text-xs text-mute">guest</span>}
                    </span>
                    <span className="tabular block text-xs text-mute">
                      in {formatCents(row.buyInCents, { compact: true })}
                      {row.rebuys > 0 && ` · ${row.rebuys} ${plural(row.rebuys, isTourney ? 'rebuy' : 'reload')}`}
                      {!isTourney && row.cashOutCents != null && ` · out ${formatCents(row.cashOutCents, { compact: true })}`}
                      {isTourney && row.place != null && ` · ${ordinal(row.place)}`}
                      {isTourney && (row.cashOutCents ?? 0) > 0 && ` · paid ${formatCents(row.cashOutCents ?? 0, { compact: true })}`}
                    </span>
                  </span>
                  {settled || (isTourney && (row.cashOutCents ?? 0) > 0) ? (
                    <MoneyDelta cents={net} size="md" compact />
                  ) : (
                    <span className="tabular text-base text-zinc-400">{formatCents(row.buyInCents, { compact: true })}</span>
                  )}
                  <Icon name={open ? 'chevron-down' : 'chevron-right'} className="h-4 w-4 shrink-0 text-zinc-500" />
                </button>
                {open && (
                  <LedgerRowEditor
                    row={row}
                    kind={kind}
                    playerCount={state.rows.length}
                    currentUserId={currentUserId}
                    standardBuyIn={state.standardBuyIn}
                    disabled={busy}
                    tableLeftCents={onTable}
                    othersPlaying={state.rows.filter((r) => r.key !== row.key && r.cashOutCents == null).length}
                    onChange={(patch) => {
                      if (patch.rebuys != null && Object.keys(patch).length === 1) setRebuys(row.key, patch.rebuys)
                      else patchRow(row.key, patch)
                    }}
                    onRemove={() => removeRow(row.key)}
                    onReload={(cents) => reload(row.key, cents)}
                    onBustOut={() => bustOut(row.key)}
                    onClose={() => setOpenKey(null)}
                  />
                )}
              </div>
            )
          })
        )}
      </div>

      <LedgerFooter
        hardErrors={problems.hard}
        softWarnings={problems.soft}
        primaryLabel={isLive ? 'End the night' : 'Save changes'}
        confirmLabel={isLive ? 'End and log it' : 'Save changes'}
        busy={busy}
        confirming={confirming === 'finalize' || confirming === 'save'}
        confirmText={
          isLive ? (
            <>
              Log this session with <span className="tabular text-white">{state.rows.length}</span> players, <span className="tabular text-white">{formatCents(totals.buyIn, { compact: true })}</span> in
              and <span className="tabular text-white">{formatCents(totals.cashOut, { compact: true })}</span> out? Everyone will be asked to confirm their line.
              {guestRows > 0 && (
                <>
                  {' '}
                  {guestRows === 1 ? 'One guest has' : `${guestRows} guests have`} no account yet; their line counts now and they can confirm once you{' '}
                  <TextLink href="/poker/guests" className="text-sm">
                    link their account
                  </TextLink>
                  .
                </>
              )}
            </>
          ) : (
            <>Save these changes? All confirmations will be reset and players re-notified.</>
          )
        }
        confirmExtra={
          isLive ? (
            <div>
              <p className="mb-1.5 text-xs text-mute">How long it ran{session.started_at ? ' (worked out from the start time if left blank)' : ''}</p>
              <ChipSelect
                options={DURATION_PRESETS_MINUTES.map((m) => ({ value: String(m), label: formatDuration(m) }))}
                value={finalDuration != null ? String(finalDuration) : null}
                onChange={(v) => setFinalDuration(v != null && /^\d+$/.test(v) ? Number(v) : null)}
                size="sm"
                aria-label="Duration"
                className="tabular"
              />
            </div>
          ) : undefined
        }
        onAddPlayer={() => {
          setOpenKey(null)
          setPickerOpen(true)
        }}
        onPrimary={() => {
          setOpenKey(null)
          setPickerOpen(false)
          setConfirming(isLive ? 'finalize' : 'save')
        }}
        onConfirm={isLive ? finalize : saveEdits}
        onBack={() => setConfirming(null)}
      />
    </div>
  )
}
