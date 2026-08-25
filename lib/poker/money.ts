/** Money helpers. Everything is integer cents; formatting happens only at the edge. */

const MINUS = '−'

const whole = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})
const precise = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * `formatCents(123450)` → `$1,234.50` · `formatCents(4500, { compact: true })` → `$45`
 * `formatCents(4500, { sign: true })` → `+$45.00` · `formatCents(-2000)` → `−$20.00`
 */
export function formatCents(
  cents: number,
  opts: { sign?: boolean; compact?: boolean } = {}
): string {
  const safe = Number.isFinite(cents) ? Math.round(cents) : 0
  const abs = Math.abs(safe)
  const useWhole = opts.compact && abs % 100 === 0
  const body = (useWhole ? whole : precise).format(abs / 100)
  if (safe < 0) return `${MINUS}${body}`
  if (safe > 0 && opts.sign) return `+${body}`
  return body
}

/**
 * Parse user input like `20`, `20.5`, `$20.50`, `1,250`, ` .5 ` into cents.
 * Returns null for empty or invalid input. Integer math only (no float rounding).
 */
export function parseDollarsToCents(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, '')
  if (cleaned === '') return null
  const m = /^(\d{0,7})(?:\.(\d{0,2}))?$/.exec(cleaned)
  if (!m) return null
  const [, dollars, fraction = ''] = m
  if (dollars === '' && fraction === '') return null
  const centsPart = fraction.padEnd(2, '0')
  return Number(dollars || '0') * 100 + Number(centsPart)
}

/** Canonical text for an input field: `2050` → `20.50`, `2000` → `20` */
export function centsToInputText(cents: number | null): string {
  if (cents == null) return ''
  const abs = Math.abs(cents)
  const dollars = Math.floor(abs / 100)
  const rest = abs % 100
  return rest === 0 ? String(dollars) : `${dollars}.${String(rest).padStart(2, '0')}`
}

export function formatRoi(pct: number | null | undefined): string {
  if (pct == null || !Number.isFinite(pct)) return '—'
  const rounded = Math.round(pct)
  return `${rounded > 0 ? '+' : ''}${rounded}%`
}

/** `150` → `2h 30m`, `45` → `45m` */
export function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null || minutes <= 0) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function ordinal(n: number): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}
