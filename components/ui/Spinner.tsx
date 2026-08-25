import { cn } from '@/lib/utils'

export default function Spinner({ size = 'md', className }: { size?: 'sm' | 'md'; className?: string }) {
  return (
    <span
      className={cn(
        'inline-block animate-spin rounded-full border-2 border-line border-t-orange-500',
        size === 'sm' ? 'h-5 w-5' : 'h-8 w-8',
        className
      )}
      role="status"
      aria-label="Loading"
    />
  )
}

/** Full-viewport centered spinner for route-level Suspense fallbacks */
export function PageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Spinner />
    </div>
  )
}
