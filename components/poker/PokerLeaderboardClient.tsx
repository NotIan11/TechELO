'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import GameIcon from '@/components/ui/GameIcon'
import HouseChip from '@/components/ui/HouseChip'
import MoneyDelta from '@/components/ui/MoneyDelta'
import Segmented from '@/components/ui/Segmented'
import WinLossDots from '@/components/ui/WinLossDots'
import { KIND_OPTIONS, PERIOD_OPTIONS, SORT_OPTIONS } from '@/lib/poker/constants'
import { formatCents, formatRoi } from '@/lib/poker/money'
import type { PokerKindFilter, PokerLeaderboardRow, PokerPeriod, PokerSort } from '@/lib/poker/types'
import { cn } from '@/lib/utils'

interface PokerLeaderboardClientProps {
  rows: PokerLeaderboardRow[]
  formByUser: Record<string, ('W' | 'L')[]>
  kind: PokerKindFilter
  period: PokerPeriod
  sort: PokerSort
  dorms: { id: string; name: string }[]
  selectedDormId: string | null
  currentPage: number
  totalPages: number
  currentUserId: string | null
}

export default function PokerLeaderboardClient({
  rows,
  formByUser,
  kind,
  period,
  sort,
  dorms,
  selectedDormId,
  currentPage,
  totalPages,
  currentUserId,
}: PokerLeaderboardClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    const qs = params.toString()
    router.push(`/poker${qs ? `?${qs}` : ''}#leaderboard`)
  }

  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(Number(r.net_cents))))
  const winPct = (r: PokerLeaderboardRow) => (r.sessions_played > 0 ? Math.round((r.winning_sessions / r.sessions_played) * 100) : 0)

  return (
    <div className="space-y-4" id="leaderboard">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented<PokerKindFilter>
          value={kind}
          onChange={(v) => updateParams({ kind: v === 'all' ? null : v, page: null })}
          options={KIND_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
        <select
          value={period}
          onChange={(e) => updateParams({ period: e.target.value === 'term' ? null : e.target.value, page: null })}
          aria-label="Time period"
          className="input w-auto cursor-pointer"
        >
          {PERIOD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={selectedDormId || ''}
          onChange={(e) => updateParams({ dorm_id: e.target.value || null, page: null })}
          aria-label="Filter by house"
          className="input w-auto cursor-pointer"
        >
          <option value="">All Houses</option>
          {dorms.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => updateParams({ sort: e.target.value === 'net' ? null : e.target.value, page: null })}
          aria-label="Sort by"
          className="input w-auto cursor-pointer"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              By {o.label.toLowerCase()}
            </option>
          ))}
        </select>
        {sort === 'roi' && <span className="text-xs text-slate-500">ROI ranking needs 5+ sessions</span>}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<GameIcon game="poker" className="h-10 w-10 text-slate-500" />}
          title="Nobody on the board yet"
          description="Players appear once a session has been logged in this period. Be the first to bink."
          action={<Button href="/poker/sessions/new">Start a session</Button>}
        />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/[0.06]">
              <thead>
                <tr className="text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 sm:px-5">#</th>
                  <th className="px-4 py-3 sm:px-5">Player</th>
                  <th className="px-4 py-3 text-right sm:px-5">Net</th>
                  <th className="hidden px-4 py-3 text-right sm:table-cell sm:px-5">Staked</th>
                  <th className="hidden px-4 py-3 text-right sm:table-cell sm:px-5">ROI</th>
                  <th className="px-4 py-3 text-right sm:px-5">Sessions</th>
                  <th className="hidden px-4 py-3 text-right md:table-cell md:px-5">Win %</th>
                  <th className="hidden px-4 py-3 lg:table-cell lg:px-5">Form</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {rows.map((r) => {
                  const isMe = r.user_id === currentUserId
                  const net = Number(r.net_cents)
                  return (
                    <tr key={r.user_id} className={cn('transition hover:bg-white/[0.03]', isMe && 'bg-orange-400/[0.06]')}>
                      <td className="tabular whitespace-nowrap px-4 py-3.5 text-sm font-semibold text-slate-500 sm:px-5">{r.rank}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 sm:px-5">
                        <Link href={`/profile/${r.user_id}`} className="group inline-flex items-center gap-3">
                          <Avatar src={r.profile_image_url} name={r.display_name} size="sm" />
                          <span>
                            <span className="block text-sm font-medium text-white group-hover:text-orange-300">
                              {r.display_name}
                              {isMe && <span className="ml-2 text-xs text-orange-400">you</span>}
                            </span>
                            <span className="mt-0.5 hidden md:block">
                              <HouseChip name={r.dorm_name} />
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right sm:px-5">
                        <div className="flex items-center justify-end gap-3">
                          <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-white/[0.06] lg:block" aria-hidden="true">
                            <span
                              className={cn('block h-full rounded-full', net >= 0 ? 'bg-emerald-400/70' : 'bg-red-400/70')}
                              style={{ width: `${Math.max(6, Math.round((Math.abs(net) / maxAbs) * 100))}%` }}
                            />
                          </span>
                          <MoneyDelta cents={net} chip compact />
                        </div>
                      </td>
                      <td className="tabular hidden whitespace-nowrap px-4 py-3.5 text-right text-sm text-slate-300 sm:table-cell sm:px-5">
                        {formatCents(Number(r.staked_cents), { compact: true })}
                      </td>
                      <td className="tabular hidden whitespace-nowrap px-4 py-3.5 text-right text-sm text-slate-300 sm:table-cell sm:px-5">
                        {formatRoi(r.roi_pct == null ? null : Number(r.roi_pct))}
                      </td>
                      <td className="tabular whitespace-nowrap px-4 py-3.5 text-right text-sm text-slate-300 sm:px-5">{r.sessions_played}</td>
                      <td className="tabular hidden whitespace-nowrap px-4 py-3.5 text-right text-sm text-slate-400 md:table-cell md:px-5">
                        {winPct(r)}%
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-3.5 lg:table-cell lg:px-5">
                        <WinLossDots form={(formByUser[r.user_id] ?? []).slice(0, 5)} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="secondary" size="sm" disabled={currentPage === 1} onClick={() => updateParams({ page: String(currentPage - 1) })}>
            ← Previous
          </Button>
          <p className="tabular text-sm text-slate-400">
            Page {currentPage} of {totalPages}
          </p>
          <Button variant="secondary" size="sm" disabled={currentPage === totalPages} onClick={() => updateParams({ page: String(currentPage + 1) })}>
            Next →
          </Button>
        </div>
      )}
    </div>
  )
}
