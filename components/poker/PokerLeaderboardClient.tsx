'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Button from '@/components/ui/Button'
import { Table, Td, Th, Tr } from '@/components/ui/DataTable'
import DivergingBar from '@/components/ui/DivergingBar'
import EmptyState from '@/components/ui/EmptyState'
import HouseChip from '@/components/ui/HouseChip'
import MoneyDelta from '@/components/ui/MoneyDelta'
import Pagination from '@/components/ui/Pagination'
import Segmented from '@/components/ui/Segmented'
import { SELECT_CLASS } from './ParamControls'
import { KIND_OPTIONS, SHARK_MIN_SESSIONS, SORT_OPTIONS } from '@/lib/poker/constants'
import { formatRoi } from '@/lib/poker/money'
import { plural } from '@/lib/poker/phrases'
import type { PokerKindFilter, PokerLeaderboardRow, PokerSort } from '@/lib/poker/types'
import { cn } from '@/lib/utils'

interface PokerLeaderboardClientProps {
  rows: PokerLeaderboardRow[]
  /** Players matching the filters across every page */
  total: number
  kind: PokerKindFilter
  sort: PokerSort
  dorms: { id: string; name: string }[]
  selectedDormId: string | null
  currentPage: number
  totalPages: number
  currentUserId: string | null
}

export default function PokerLeaderboardClient({
  rows,
  total,
  kind,
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

  return (
    <div id="leaderboard" className="scroll-mt-24">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2">
        <Segmented<PokerKindFilter>
          value={kind}
          onChange={(v) => updateParams({ kind: v === 'all' ? null : v, page: null })}
          options={KIND_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          className="border-b-0"
        />
        <span className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <select value={selectedDormId || ''} onChange={(e) => updateParams({ dorm_id: e.target.value || null, page: null })} aria-label="Filter by house" className={SELECT_CLASS}>
            <option value="">All houses</option>
            {dorms.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select value={sort} onChange={(e) => updateParams({ sort: e.target.value === 'net' ? null : e.target.value, page: null })} aria-label="Sort by" className={SELECT_CLASS}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                By {o.label === 'ROI' ? o.label : o.label.toLowerCase()}
              </option>
            ))}
          </select>
        </span>
      </div>
      {sort === 'roi' && <p className="mt-1 text-xs text-mute">ROI needs {SHARK_MIN_SESSIONS} sessions.</p>}

      {rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Nobody on the ledger yet"
            description="Players appear once a session in this period is logged."
            action={
              <Button href="/play" variant="outline">
                Open a table
              </Button>
            }
          />
        </div>
      ) : (
        <Table className="mt-1">
          <thead>
            <tr>
              <Th className="w-11">Rank</Th>
              <Th>Player</Th>
              <Th align="center" hide="md" className="w-60">
                Down · Up
              </Th>
              <Th align="right">Net</Th>
              <Th align="right">Nights</Th>
              <Th align="right" hide="sm">
                ROI
              </Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isMe = r.user_id === currentUserId
              const net = Number(r.net_cents)
              return (
                <Tr key={r.user_id} me={isMe}>
                  <Td className={cn('tabular', Number(r.rank) === 1 ? 'text-orange-400' : 'text-zinc-400')}>{r.rank}</Td>
                  <Td>
                    <Link href={`/profile/${r.user_id}`} className="group inline-flex min-h-[44px] items-baseline gap-2.5 py-3">
                      <span className="text-[15px] text-white underline-offset-4 group-hover:underline">{r.display_name}</span>
                      <HouseChip name={r.dorm_name} className="hidden sm:inline-flex" />
                      {isMe && <span className="text-xs text-orange-400">you</span>}
                    </Link>
                  </Td>
                  <Td hide="md" className="w-60">
                    <DivergingBar value={net} max={maxAbs} className="px-3" />
                  </Td>
                  <Td align="right">
                    <MoneyDelta cents={net} size="md" compact className="text-[15px]" />
                  </Td>
                  <Td numeric className="text-zinc-400">
                    {r.sessions_played}
                  </Td>
                  <Td numeric hide="sm" className="text-zinc-400">
                    {formatRoi(r.roi_pct == null ? null : Number(r.roi_pct))}
                  </Td>
                </Tr>
              )
            })}
          </tbody>
        </Table>
      )}

      {rows.length > 0 && (
        <p className="mt-4 border-t border-line-strong pt-3.5 text-[13px] text-mute">
          <span className="tabular">{rows.length}</span> of <span className="tabular">{total}</span> {plural(total, 'player')}. Every line is confirmed by the player it belongs to, or marked until it
          is.
        </p>
      )}
      {totalPages > 1 && (
        <div className="mt-5">
          <Pagination page={currentPage} totalPages={totalPages} onPage={(p) => updateParams({ page: String(p) })} />
        </div>
      )}
    </div>
  )
}
