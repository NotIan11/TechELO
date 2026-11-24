'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

function useParamUpdater() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  return (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    const qs = params.toString()
    router.push(`${pathname}${qs ? `?${qs}` : ''}`)
  }
}

export const SELECT_CLASS = 'input w-auto cursor-pointer bg-ink-950 py-0 text-sm'

interface ParamSelectProps {
  /** Query-string key this select drives */
  param: string
  value: string
  /** Value that means "no filter": it is dropped from the URL */
  defaultValue: string
  options: { value: string; label: string }[]
  'aria-label': string
  className?: string
}

/** A quiet select that writes one query-string parameter and resets `page` */
export function ParamSelect({ param, value, defaultValue, options, className, ...rest }: ParamSelectProps) {
  const update = useParamUpdater()
  return (
    <select
      value={value}
      aria-label={rest['aria-label']}
      onChange={(e) => update({ [param]: e.target.value === defaultValue ? null : e.target.value, page: null })}
      className={cn(SELECT_CLASS, className)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

/** A checkbox that sets `param=1` in the query string and resets `page` */
export function ParamCheckbox({ param, checked, label }: { param: string; checked: boolean; label: string }) {
  const update = useParamUpdater()
  return (
    <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-zinc-300">
      <input type="checkbox" className="h-4 w-4 accent-orange-500" checked={checked} onChange={(e) => update({ [param]: e.target.checked ? '1' : null, page: null })} />
      {label}
    </label>
  )
}
