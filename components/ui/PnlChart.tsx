import { useId } from 'react'
import { cn } from '@/lib/utils'

interface PnlChartProps {
  /** Cumulative values, oldest → newest */
  values: number[]
  width?: number
  height?: number
  className?: string
  /** Stretch to the container width (keeps the viewBox aspect for strokes) */
  fluid?: boolean
}

/**
 * Cumulative PnL line with a dashed zero baseline; area is tinted green above
 * zero and red below. Line color comes from currentColor. Renders nothing
 * with fewer than 2 points.
 */
export default function PnlChart({ values, width = 320, height = 96, className, fluid = true }: PnlChartProps) {
  const id = useId().replace(/:/g, '')
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
  const area = `${path} L${lastX.toFixed(1)},${zeroY.toFixed(1)} L${points[0][0].toFixed(1)},${zeroY.toFixed(1)} Z`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={fluid ? undefined : width}
      height={fluid ? undefined : height}
      preserveAspectRatio={fluid ? 'none' : undefined}
      className={cn('overflow-visible', fluid && 'h-24 w-full', className)}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={`${id}-above`}>
          <rect x="0" y="0" width={width} height={Math.max(zeroY, 0)} />
        </clipPath>
        <clipPath id={`${id}-below`}>
          <rect x="0" y={zeroY} width={width} height={Math.max(height - zeroY, 0)} />
        </clipPath>
      </defs>
      <path d={area} fill="#34d399" opacity="0.16" clipPath={`url(#${id}-above)`} />
      <path d={area} fill="#f87171" opacity="0.16" clipPath={`url(#${id}-below)`} />
      <line
        x1={pad}
        x2={width - pad}
        y1={zeroY}
        y2={zeroY}
        stroke="currentColor"
        strokeOpacity="0.3"
        strokeDasharray="3 3"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={lastX} cy={lastY} r="3" fill={last >= 0 ? '#34d399' : '#f87171'} />
    </svg>
  )
}
