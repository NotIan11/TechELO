'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Table, Td, Th, Tr } from '@/components/ui/DataTable'
import HouseChip from '@/components/ui/HouseChip'
import PageIntro from '@/components/ui/PageIntro'
import Pagination from '@/components/ui/Pagination'
import Tabs, { type TabItem } from '@/components/ui/Tabs'
import TextLink from '@/components/ui/TextLink'
import WinLossDots from '@/components/ui/WinLossDots'
import type { FormResult } from '@/lib/stats'

interface LeaderboardEntry {
  rank: number
  user_id: string
  display_name: string
  rating: number
  matches_played: number
  wins: number
  losses: number
  dorm_name: string | null
  /** Net rating change over the last 30 days; null when they have not played in that time */
  change30: number | null
  /** Most recent results first, from the last 30 days */
  form: FormResult[]
}

interface LeaderboardClientProps {
  title: string
  lede: React.ReactNode
  tabs: TabItem[]
  leaderboard: LeaderboardEntry[]
  gameType: 'pool' | 'ping_pong'
  currentPage: number
  pageSize: number
  total: number
  totalPages: number
  dorms: { id: string; name: string }[]
  selectedDormId: string | null
  currentUserId: string | null
}

export default function LeaderboardClient({
  title,
  lede,
  tabs,
  leaderboard,
  gameType,
  currentPage,
  pageSize,
  total,
  totalPages,
  dorms,
  selectedDormId,
  currentUserId,
}: LeaderboardClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState('')

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    const qs = params.toString()
    router.push(`/leaderboard${qs ? `?${qs}` : ''}`)
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return leaderboard
    return leaderboard.filter((e) => e.display_name.toLowerCase().includes(q) || (e.dorm_name ?? '').toLowerCase().includes(q))
  }, [leaderboard, query])

  const first = leaderboard.length > 0 ? (currentPage - 1) * pageSize + 1 : 0
  const last = (currentPage - 1) * pageSize + leaderboard.length

  return (
    <div>
      <PageIntro
        title={title}
        lede={lede}
        actions={
          <>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={totalPages > 1 ? 'Find a player on this page' : 'Find a player'}
              placeholder={totalPages > 1 ? 'Find on this page' : 'Find a player'}
              className="input w-full sm:w-[200px]"
            />
            <select
              value={selectedDormId || ''}
              onChange={(e) => updateParams({ dorm_id: e.target.value || null, page: null })}
              aria-label="Filter by house"
              className="input w-full cursor-pointer bg-ink-950 sm:w-auto sm:min-w-[10rem]"
            >
              <option value="">All houses</option>
              {dorms.map((dorm) => (
                <option key={dorm.id} value={dorm.id}>
                  {dorm.name}
                </option>
              ))}
            </select>
          </>
        }
      />

      <Tabs items={tabs} className="mt-9" />

      {leaderboard.length === 0 ? (
        <p className="border-b border-line py-6 text-[15px] text-zinc-400">
          Nobody is ranked yet. A rating appears after one confirmed match.{' '}
          <TextLink href={`/play?game_type=${gameType}`} className="text-[15px]">
            Challenge someone
          </TextLink>
        </p>
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <Th className="w-[76px]">Rank</Th>
                <Th>Player</Th>
                <Th align="right">Rating</Th>
                <Th align="right" hide="sm">
                  30 days
                </Th>
                <Th hide="md" className="pl-10">
                  Record
                </Th>
                <Th hide="lg">Last five</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {rows.map((entry, i) => {
                const isMe = entry.user_id === currentUserId
                const belowMe = i > 0 && rows[i - 1].user_id === currentUserId
                return (
                  <Tr key={entry.user_id} className={cn((isMe || belowMe) && '!border-line-bright')}>
                    <Td className={cn('tabular', entry.rank === 1 ? 'text-orange-400' : 'text-zinc-400')}>{entry.rank}</Td>
                    <Td>
                      <Link href={`/profile/${entry.user_id}`} className="group inline-flex min-h-[44px] items-center gap-2.5">
                        <span className="text-[15px] text-white group-hover:underline">{entry.display_name}</span>
                        <HouseChip name={entry.dorm_name} className="hidden sm:inline-flex" />
                        {isMe && <span className="text-xs text-orange-400">you</span>}
                      </Link>
                    </Td>
                    <Td numeric className="text-base text-white">
                      {entry.rating}
                    </Td>
                    <Td
                      numeric
                      hide="sm"
                      className={entry.change30 == null || entry.change30 === 0 ? 'text-mute' : entry.change30 > 0 ? 'text-win' : 'text-loss'}
                    >
                      {entry.change30 == null ? '—' : `${entry.change30 > 0 ? '+' : entry.change30 < 0 ? '−' : ''}${Math.abs(entry.change30)}`}
                    </Td>
                    <Td hide="md" className="tabular pl-10 text-zinc-400">
                      {entry.wins}–{entry.losses}
                    </Td>
                    <Td hide="lg">{entry.form.length > 0 ? <WinLossDots form={entry.form} /> : <span className="text-xs text-zinc-600">—</span>}</Td>
                    <Td align="right">
                      {!isMe && (
                        <TextLink href={`/play?opponent=${entry.user_id}&game_type=${gameType}`} className="min-h-[44px] text-[13px]">
                          Challenge
                        </TextLink>
                      )}
                    </Td>
                  </Tr>
                )
              })}
            </tbody>
          </Table>

          {rows.length === 0 && <p className="border-t border-line py-6 text-sm text-mute">No players match “{query}” on this page.</p>}

          <div className="mt-5 border-t border-line-strong pt-4">
            <p className="text-[13px] text-mute">
              Showing <span className="tabular">{first}</span> to <span className="tabular">{last}</span> of <span className="tabular">{total}</span>
            </p>
            {totalPages > 1 && (
              <div className="mt-4">
                <Pagination page={currentPage} totalPages={totalPages} onPage={(p) => updateParams({ page: String(p) })} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
