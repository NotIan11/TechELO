import { cn } from '@/lib/utils'

interface SectionHeaderProps {
  title: React.ReactNode
  aside?: React.ReactNode
  className?: string
}

/** Uppercase section label with an optional right-aligned link/action */
export default function SectionHeader({ title, aside, className }: SectionHeaderProps) {
  return (
    <div className={cn('mb-3 flex items-baseline justify-between gap-3', className)}>
      <h2 className="eyebrow">{title}</h2>
      {aside && <div className="text-xs">{aside}</div>}
    </div>
  )
}
