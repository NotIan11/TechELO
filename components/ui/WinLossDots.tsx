import { cn } from '@/lib/utils'
import type { FormResult } from '@/lib/stats'

/** Recent form as a row of W/L dots, most recent first */
export default function WinLossDots({ form, className }: { form: FormResult[]; className?: string }) {
  if (form.length === 0) return null
  return (
    <span className={cn('inline-flex items-center gap-1', className)} title={`Recent form: ${form.join(' ')}`}>
      {form.map((r, i) => (
        <span
          key={i}
          className={cn(
            'inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold',
            r === 'W' ? 'bg-win/20 text-win' : 'bg-loss/20 text-loss'
          )}
        >
          {r}
        </span>
      ))}
    </span>
  )
}
