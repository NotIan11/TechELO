import Link from 'next/link'
import { cn } from '@/lib/utils'

export interface TabItem {
  href: string
  label: string
  /** Small mono count after the label */
  count?: number | null
  active?: boolean
}

/** Page-level tabs as plain links on a hairline; the active one is underlined in white */
export default function Tabs({ items, className }: { items: TabItem[]; className?: string }) {
  return (
    <nav className={cn('flex flex-wrap gap-x-7 border-b border-line-strong', className)} aria-label="Sections">
      {items.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.active ? 'page' : undefined}
          className={cn(
            '-mb-px inline-flex min-h-[44px] items-center gap-1.5 border-b text-sm transition',
            t.active ? 'border-white text-white' : 'border-transparent text-mute hover:text-white'
          )}
        >
          {t.label}
          {t.count != null && <span className="tabular text-xs">{t.count}</span>}
        </Link>
      ))}
    </nav>
  )
}
