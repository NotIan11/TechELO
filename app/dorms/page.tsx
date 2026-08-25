import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/layout/AppShell'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import Badge from '@/components/ui/Badge'
import Icon from '@/components/ui/Icon'
import ListRow from '@/components/ui/ListRow'
import RankRing from '@/components/ui/RankRing'
import TextLink from '@/components/ui/TextLink'
import { getHouseColor } from '@/lib/utils'
import { getHouseStandings } from '@/lib/houses'

export default async function DormsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [standings, { data: userProfile }] = await Promise.all([
    getHouseStandings(supabase),
    user ? supabase.from('users').select('dorm_id').eq('id', user.id).single() : Promise.resolve({ data: null }),
  ])

  return (
    <AppShell width="4xl">
      <PageHeader
        eyebrow="House Cup"
        title="Houses"
        subtitle="Standings by average rating of ranked players"
        actions={
          user ? (
            <Button href="/dorms/new" variant="secondary">
              <Icon name="plus" className="h-4 w-4" /> New house
            </Button>
          ) : undefined
        }
      />

      {standings.length === 0 ? (
        <EmptyState
          icon="house"
          title="No houses yet"
          description="Create the first house."
          action={user ? <Button href="/dorms/new">Create a house</Button> : <Button href="/signup">Join</Button>}
        />
      ) : (
        <div className="space-y-3">
          {standings.map((house, index) => (
            <ListRow
              key={house.id}
              href={`/dorms/${house.id}`}
              accent={getHouseColor(house.name)}
              chevron={false}
              leading={<RankRing rank={index + 1} size="md" className="ml-1" />}
              title={<span className="font-display text-lg">{house.name}</span>}
              badges={userProfile?.dorm_id === house.id ? <Badge tone="orange">Your house</Badge> : undefined}
              meta={
                <>
                  <span>
                    {house.total_members} member{house.total_members === 1 ? '' : 's'}
                  </span>
                  {house.rankedPlayers > 0 && <span>· {house.rankedPlayers} ranked</span>}
                  {house.description && <span>· {house.description}</span>}
                </>
              }
              trailing={
                <div className="flex items-center gap-6 text-right">
                  <div className="hidden sm:block">
                    <p className="tabular text-sm font-semibold text-win">{house.totalWins}</p>
                    <p className="eyebrow">wins</p>
                  </div>
                  <div>
                    <p className="tabular font-display text-xl font-bold text-white">{house.avgRating > 0 ? house.avgRating : '—'}</p>
                    <p className="eyebrow">avg rating</p>
                  </div>
                </div>
              }
            />
          ))}
        </div>
      )}

      <p className="mt-6 text-[13px] text-zinc-400">
        Standings count pool and ping pong. Poker keeps its own score.{' '}
        <TextLink href="/poker" arrow="right" className="text-[13px]">
          See the ledger
        </TextLink>
      </p>
    </AppShell>
  )
}
