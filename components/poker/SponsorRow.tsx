import type { PokerSponsorRow } from '@/lib/poker/types'
import { cn } from '@/lib/utils'

/** "Sponsored by" logo strip for official tournaments */
export default function SponsorRow({ sponsors, size = 'md', className }: { sponsors: PokerSponsorRow[]; size?: 'sm' | 'md'; className?: string }) {
  if (sponsors.length === 0) return null
  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-2', className)}>
      <span className="text-xs uppercase tracking-wider text-slate-500">Sponsored by</span>
      {sponsors.map((s) => {
        const inner = s.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={s.logo_url}
            alt={s.name}
            title={s.name}
            className={cn('object-contain', size === 'sm' ? 'h-6 max-w-[80px]' : 'h-9 max-w-[140px]')}
          />
        ) : (
          <span className={cn('font-semibold text-slate-200', size === 'sm' ? 'text-sm' : 'text-base')}>{s.name}</span>
        )
        return s.website_url ? (
          <a key={s.id} href={s.website_url} target="_blank" rel="noopener noreferrer" className="opacity-90 transition hover:opacity-100">
            {inner}
          </a>
        ) : (
          <span key={s.id}>{inner}</span>
        )
      })}
    </div>
  )
}
