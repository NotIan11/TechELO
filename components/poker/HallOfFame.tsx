import Link from 'next/link'
import type { Award } from '@/lib/poker/types'

/** The three superlatives the hub keeps, in order, with the plain label each is shown under */
const KEPT: { key: string; label: string }[] = [
  { key: 'biggest_night', label: 'Biggest night' },
  { key: 'heater', label: 'Longest heater' },
  { key: 'reload_king', label: 'Most reloads' },
]

/** "This term": three plain label · value rows taken from the group awards */
export default function HallOfFame({ awards, heading }: { awards: Award[]; heading: string }) {
  const rows = KEPT.map((k) => ({ ...k, award: awards.find((a) => a.key === k.key) })).filter(
    (r): r is { key: string; label: string; award: Award } => !!r.award && (r.award.holder != null || r.award.sessionId != null)
  )
  if (rows.length === 0) return null
  return (
    <section>
      <h2 className="border-b border-line-strong pb-2.5 font-sans text-xs tracking-normal text-mute">{heading}</h2>
      {rows.map(({ key, label, award }) => {
        const who = award.holder?.display_name ?? award.sessionTitle ?? null
        const href = award.holder ? `/profile/${award.holder.id}` : award.sessionId ? `/poker/sessions/${award.sessionId}` : null
        return (
          <p key={key} className="flex justify-between gap-3 border-b border-line py-3 text-sm text-zinc-300">
            <span className="min-w-0 truncate">
              {label}
              {who && (
                <>
                  {' · '}
                  {href ? (
                    <Link href={href} className="transition hover:text-white">
                      {who}
                    </Link>
                  ) : (
                    who
                  )}
                </>
              )}
            </span>
            <span className="tabular shrink-0 text-white">{award.valueLabel}</span>
          </p>
        )
      })}
    </section>
  )
}
