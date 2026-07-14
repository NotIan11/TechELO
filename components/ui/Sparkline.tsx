import { cn } from '@/lib/utils'

interface SparklineProps {
  values: number[]
  width?: number
  height?: number
  className?: string
}

/**
 * Minimal SVG line chart for rating history. Uses currentColor, so set the
 * color with a text-* class. Renders nothing with fewer than 2 points.
 */
export default function Sparkline({ values, width = 160, height = 40, className }: SparklineProps) {
  if (values.length < 2) return null

  const pad = 3
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (width - pad * 2)
    const y = pad + (1 - (v - min) / range) * (height - pad * 2)
    return [x, y] as const
  })

  const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const [lastX, lastY] = points[points.length - 1]
  const area = `${path} L${lastX.toFixed(1)},${height - pad} L${points[0][0].toFixed(1)},${height - pad} Z`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn('overflow-visible', className)}
      aria-hidden="true"
    >
      <path d={area} fill="currentColor" opacity="0.12" />
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r="2.5" fill="currentColor" />
    </svg>
  )
}
