import { cn } from '@/lib/utils'

interface PnlChartProps {
  /** Cumulative values, oldest → newest */
  values: number[]
  width?: number
  height?: number
  className?: string
  /** Stretch to the container width */
  fluid?: boolean
}

/**
 * Cumulative PnL line with a dotted zero baseline. Line color comes from currentColor. Renders nothing with
 * fewer than 2 points.
 */
export default function PnlChart({ values, width = 320, height = 96, className, fluid = true }: PnlChartProps) {
  if (values.length < 2) return null

  const pad = 4
  const min = Math.min(0, ...values)
  const max = Math.max(0, ...values)
  const range = max - min || 1
  const innerW = width - pad * 2
  const innerH = height - pad * 2

  const y = (v: number) => pad + (1 - (v - min) / range) * innerH
  const points = values.map((v, i) => [pad + (i / (values.length - 1)) * innerW, y(v)] as const)
  const path = points.map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ')
  const zeroY = y(0)
  const [lastX, lastY] = points[points.length - 1]
  const last = values[values.length - 1]

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={fluid ? undefined : width}
      height={fluid ? undefined : height}
      preserveAspectRatio={fluid ? 'none' : undefined}
      className={cn('overflow-visible', fluid && 'h-24 w-full', className)}
      aria-hidden="true"
    >
      <line
        x1={pad}
        x2={width - pad}
        y1={zeroY}
        y2={zeroY}
        stroke="currentColor"
        strokeOpacity="0.3"
        strokeDasharray="2 4"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={lastX} cy={lastY} r="3" className={last >= 0 ? 'fill-win' : 'fill-loss'} />
    </svg>
  )
}
