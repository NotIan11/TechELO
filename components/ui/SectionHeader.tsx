import { cn } from '@/lib/utils'

interface SectionHeaderProps {
  title: React.ReactNode
  aside?: React.ReactNode
  className?: string
}

/** Quiet section label on a hairline, with an optional right-aligned link/action */
export default function SectionHeader({ title, aside, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-baseline justify-between gap-3 border-b border-line-strong pb-3', className)}>
      <h2 className="font-sans text-[13px] font-normal tracking-normal text-mute">{title}</h2>
      {aside && <div className="text-xs">{aside}</div>}
    </div>
  )
}
