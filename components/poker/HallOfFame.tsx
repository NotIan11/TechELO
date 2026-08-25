import Avatar from '@/components/ui/Avatar'
import Icon, { type IconName } from '@/components/ui/Icon'
import IconTile from '@/components/ui/IconTile'
import ListRow from '@/components/ui/ListRow'
import SectionHeader from '@/components/ui/SectionHeader'
import type { Award } from '@/lib/poker/types'

const ICONS: Record<Award['icon'], IconName> = {
  whale: 'whale',
  shark: 'shark',
  grinder: 'pick',
  heater: 'flame',
  night: 'dice',
  reload: 'refresh',
  bubble: 'bubble',
  champ: 'trophy',
  generous: 'gift',
}

function AwardCard({ award }: { award: Award }) {
  const href = award.holder ? `/profile/${award.holder.id}` : award.sessionId ? `/poker/sessions/${award.sessionId}` : undefined
  return (
    <ListRow
      href={href}
      size="sm"
      chevron={false}
      dim={!href}
      leading={<IconTile icon={<Icon name={ICONS[award.icon]} />} />}
      title={award.title}
      meta={
        <>
          {award.holder ? (
            <span className="inline-flex items-center gap-1.5">
              <Avatar src={award.holder.profile_image_url} name={award.holder.display_name} size="xs" />
              <span className="truncate text-zinc-300">{award.holder.display_name}</span>
            </span>
          ) : award.sessionTitle ? (
            <span className="truncate text-zinc-300">{award.sessionTitle}</span>
          ) : (
            <span className="text-zinc-600">Unclaimed</span>
          )}
          <span>· {award.blurb}</span>
        </>
      }
      trailing={<span className="tabular text-xs font-semibold text-zinc-300">{award.valueLabel}</span>}
    />
  )
}

/** Hall of Fame grid for the hub */
export default function HallOfFame({ awards, periodLabel }: { awards: Award[]; periodLabel: string }) {
  return (
    <section>
      <SectionHeader title="Hall of Fame" aside={<span className="text-zinc-500">{periodLabel}</span>} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {awards.map((a) => (
          <AwardCard key={a.key} award={a} />
        ))}
      </div>
    </section>
  )
}
