import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/layout/AppShell'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import Badge from '@/components/ui/Badge'
import { cn, getHouseColor } from '@/lib/utils'

interface HouseStanding {
  id: string
  name: string
  description: string | null
  total_members: number
  rankedPlayers: number
  avgRating: number
  totalWins: number
  totalMatches: number
}

export default async function DormsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/dorms')
  }

  const [{ data: dorms }, { data: userProfile }, { data: members }, { data: ratings }] =
    await Promise.all([
      supabase.from('dorms').select('*').order('name'),
      supabase.from('users').select('dorm_id').eq('id', user.id).single(),
      supabase.from('users').select('id, dorm_id').not('dorm_id', 'is', null),
      supabase
        .from('elo_ratings')
        .select('user_id, rating, wins, matches_played')
        .gt('matches_played', 0),
    ])

  // Aggregate ranked ratings per house ("House Cup" standings)
  const dormByUser = new Map((members ?? []).map((m) => [m.id, m.dorm_id]))
  const agg = new Map<string, { sum: number; n: number; wins: number; matches: number }>()
  for (const r of ratings ?? []) {
    const dormId = dormByUser.get(r.user_id)
    if (!dormId) continue
    const entry = agg.get(dormId) ?? { sum: 0, n: 0, wins: 0, matches: 0 }
    entry.sum += r.rating
    entry.n += 1
    entry.wins += r.wins
    entry.matches += r.matches_played
    agg.set(dormId, entry)
  }

  const standings: HouseStanding[] = (dorms ?? [])
    .map((dorm) => {
      const a = agg.get(dorm.id)
      return {
        id: dorm.id,
        name: dorm.name,
        description: dorm.description,
        total_members: dorm.total_members,
        rankedPlayers: a?.n ?? 0,
        avgRating: a && a.n > 0 ? Math.round(a.sum / a.n) : 0,
        totalWins: a?.wins ?? 0,
        totalMatches: a?.matches ?? 0,
      }
    })
    .sort((a, b) => b.avgRating - a.avgRating || b.totalWins - a.totalWins)

  return (
    <AppShell width="4xl">
      <PageHeader
        title="Houses"
        subtitle="Standings by average rating of ranked players"
        actions={
          <Button href="/dorms/new" variant="secondary">
            + New House
          </Button>
        }
      />

      {standings.length === 0 ? (
        <EmptyState
          icon="house"
          title="No houses yet"
          description="Create the first house and start recruiting."
          action={<Button href="/dorms/new">Create a house</Button>}
        />
      ) : (
        <div className="space-y-3">
          {standings.map((house, index) => {
            const color = getHouseColor(house.name)
            const isMine = userProfile?.dorm_id === house.id
            return (
              <Link
                key={house.id}
                href={`/dorms/${house.id}`}
                className="card group relative flex items-center gap-4 overflow-hidden p-5 transition hover:-translate-y-px hover:border-white/[0.14]"
              >
                {/* House color accent */}
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 w-1.5"
                  style={{ backgroundColor: color }}
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-[0.07]"
                  style={{ background: `linear-gradient(120deg, ${color}, transparent 55%)` }}
                />

                <span
                  className={cn(
                    'tabular relative z-10 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold',
                    index === 0
                      ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-amber-950'
                      : 'bg-white/[0.06] text-zinc-300'
                  )}
                >
                  {index + 1}
                </span>

                <div className="relative z-10 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-lg font-semibold text-white group-hover:text-orange-400">
                      {house.name}
                    </h2>
                    {isMine && <Badge tone="orange">Your house</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {house.total_members} member{house.total_members === 1 ? '' : 's'}
                    {house.rankedPlayers > 0 && <> · {house.rankedPlayers} ranked</>}
                    {house.description && <> · {house.description}</>}
                  </p>
                </div>

                <div className="relative z-10 flex shrink-0 items-center gap-6 text-right">
                  <div className="hidden sm:block">
                    <p className="tabular text-sm font-semibold text-win">{house.totalWins}</p>
                    <p className="eyebrow">wins</p>
                  </div>
                  <div>
                    <p className="tabular font-display text-xl font-bold text-white">
                      {house.avgRating > 0 ? house.avgRating : '—'}
                    </p>
                    <p className="eyebrow">avg rating</p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </AppShell>
  )
}
