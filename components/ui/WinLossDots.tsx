import { cn } from '@/lib/utils'
import type { FormResult } from '@/lib/stats'

/** Recent form as spaced mono letters, most recent first */
export default function WinLossDots({ form, className }: { form: FormResult[]; className?: string }) {
  if (form.length === 0) return null
  return (
    <span className={cn('tabular inline-flex items-center gap-1.5 text-xs', className)} title={`Recent form: ${form.join(' ')}`}>
      {form.map((r, i) => (
        <span key={i} className={r === 'W' ? 'text-win' : 'text-loss'}>
          {r}
        </span>
      ))}
    </span>
  )
}
