import { cn } from '@/lib/utils'

interface PageIntroProps {
  /** Small grey line above the title: breadcrumb, date, context */
  kicker?: React.ReactNode
  title: React.ReactNode
  /** One plain sentence that says what the numbers on this page mean right now */
  lede?: React.ReactNode
  /** Right-aligned controls (filters, one button) */
  actions?: React.ReactNode
  className?: string
}

/** Page opening: kicker, a 44px regular-weight title, and one sentence. Wrap figures in <Num>. */
export default function PageIntro({ kicker, title, lede, actions, className }: PageIntroProps) {
  return (
    <div className={cn('flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {kicker && <p className="mb-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-mute">{kicker}</p>}
        <h1 className="font-display text-4xl font-normal tracking-[-0.03em] text-white sm:text-[44px] sm:leading-[1.1]">{title}</h1>
        {lede && <p className="mt-2.5 max-w-2xl text-[15px] text-zinc-400">{lede}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3 sm:shrink-0">{actions}</div>}
    </div>
  )
}

/** A figure inside running text: mono, white unless a tone is given */
export function Num({ children, tone }: { children: React.ReactNode; tone?: 'win' | 'loss' }) {
  return <span className={cn('tabular', tone === 'win' ? 'text-win' : tone === 'loss' ? 'text-loss' : 'text-white')}>{children}</span>
}
