import Link from 'next/link'
import Avatar from '@/components/ui/Avatar'
import type { Award } from '@/lib/poker/types'
import { cn } from '@/lib/utils'

const ICONS: Record<Award['icon'], string> = {
  whale: '🐋',
  shark: '🦈',
  grinder: '⛏️',
  heater: '🔥',
  night: '🎰',
  reload: '🔁',
  bubble: '🫧',
  champ: '🏆',
  generous: '🎁',
}

function AwardCard({ award }: { award: Award }) {
  const href = award.holder ? `/profile/${award.holder.id}` : award.sessionId ? `/poker/sessions/${award.sessionId}` : null
  const body = (
    <>
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-xl" aria-hidden="true">
        {ICONS[award.icon]}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="font-display text-sm font-semibold text-white">{award.title}</span>
          <span className="tabular shrink-0 text-xs font-semibold text-zinc-300">{award.valueLabel}</span>
        </span>
        <span className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400">
          {award.holder ? (
            <>
              <Avatar src={award.holder.profile_image_url} name={award.holder.display_name} size="xs" />
              <span className="truncate">{award.holder.display_name}</span>
            </>
          ) : award.sessionTitle ? (
            <span className="truncate">{award.sessionTitle}</span>
          ) : (
            <span className="text-zinc-600">Unclaimed</span>
          )}
        </span>
        <span className="mt-1 block text-[11px] text-zinc-500">{award.blurb}</span>
      </span>
    </>
  )
  const classes = cn('card flex items-start gap-3 p-4 transition', href && 'hover:-translate-y-px hover:border-white/[0.14]')
  return href ? (
    <Link href={href} className={classes}>
      {body}
    </Link>
  ) : (
    <div className={cn(classes, 'opacity-70')}>{body}</div>
  )
}

/** Hall of Fame grid for the hub */
export default function HallOfFame({ awards, periodLabel }: { awards: Award[]; periodLabel: string }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="eyebrow">Hall of Fame</h2>
        <span className="text-xs text-zinc-500">{periodLabel}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {awards.map((a) => (
          <AwardCard key={a.key} award={a} />
        ))}
      </div>
    </section>
  )
}
