'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Avatar from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import { MiniBar, Table, Td, Th, Tr } from '@/components/ui/DataTable'
import EmptyState from '@/components/ui/EmptyState'
import GameIcon from '@/components/ui/GameIcon'
import HouseChip from '@/components/ui/HouseChip'
import MoneyDelta from '@/components/ui/MoneyDelta'
import Pagination from '@/components/ui/Pagination'
import Segmented from '@/components/ui/Segmented'
import WinLossDots from '@/components/ui/WinLossDots'
import { KIND_OPTIONS, PERIOD_OPTIONS, SORT_OPTIONS } from '@/lib/poker/constants'
import { formatCents, formatRoi } from '@/lib/poker/money'
import type { PokerKindFilter, PokerLeaderboardRow, PokerPeriod, PokerSort } from '@/lib/poker/types'

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
        <select value={period} onChange={(e) => updateParams({ period: e.target.value === 'term' ? null : e.target.value, page: null })} aria-label="Time period" className="input w-auto cursor-pointer">
          {PERIOD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select value={selectedDormId || ''} onChange={(e) => updateParams({ dorm_id: e.target.value || null, page: null })} aria-label="Filter by house" className="input w-auto cursor-pointer">
          <option value="">All Houses</option>
          {dorms.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select value={sort} onChange={(e) => updateParams({ sort: e.target.value === 'net' ? null : e.target.value, page: null })} aria-label="Sort by" className="input w-auto cursor-pointer">
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              By {o.label.toLowerCase()}
            </option>
          ))}
        </select>
        {sort === 'roi' && <span className="text-xs text-zinc-500">ROI needs 5 sessions</span>}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<GameIcon game="poker" />}
          title="Nobody on the ledger yet"
          description="Players appear once a session in this period is logged."
          action={<Button href="/poker/sessions/new">Start a session</Button>}
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>#</Th>
              <Th>Player</Th>
              <Th align="right">Net</Th>
              <Th align="right" hide="sm">
                Staked
              </Th>
              <Th align="right" hide="sm">
                ROI
              </Th>
              <Th align="right">Sessions</Th>
              <Th align="right" hide="md">
                Win %
              </Th>
              <Th hide="lg">Form</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => {
              const isMe = r.user_id === currentUserId
              const net = Number(r.net_cents)
              return (
                <Tr key={r.user_id} me={isMe}>
                  <Td className="tabular font-semibold text-zinc-500">{r.rank}</Td>
                  <Td>
                    <Link href={`/profile/${r.user_id}`} className="group inline-flex items-center gap-3">
                      <Avatar src={r.profile_image_url} name={r.display_name} size="sm" />
                      <span>
                        <span className="block text-sm font-medium text-white group-hover:text-orange-400">
                          {r.display_name}
                          {isMe && <span className="ml-2 text-xs text-orange-400">you</span>}
                        </span>
                        <span className="mt-0.5 hidden md:block">
                          <HouseChip name={r.dorm_name} />
                        </span>
                      </span>
                    </Link>
                  </Td>
                  <Td align="right">
                    <div className="flex items-center justify-end gap-3">
                      <MiniBar value={net} max={maxAbs} tone="sign" className="hidden lg:block" />
                      <MoneyDelta cents={net} chip compact />
                    </div>
                  </Td>
                  <Td numeric hide="sm">
                    {formatCents(Number(r.staked_cents), { compact: true })}
                  </Td>
                  <Td numeric hide="sm">
                    {formatRoi(r.roi_pct == null ? null : Number(r.roi_pct))}
                  </Td>
                  <Td numeric>{r.sessions_played}</Td>
                  <Td numeric hide="md" className="text-zinc-400">
                    {winPct(r)}%
                  </Td>
                  <Td hide="lg">
                    <WinLossDots form={(formByUser[r.user_id] ?? []).slice(0, 5)} />
                  </Td>
                </Tr>
              )
            })}
          </tbody>
        </Table>
      )}

      <Pagination page={currentPage} totalPages={totalPages} onPage={(p) => updateParams({ page: String(p) })} />
    </div>
  )
}
