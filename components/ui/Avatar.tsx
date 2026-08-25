import { cn, getInitials } from '@/lib/utils'

interface AvatarProps {
  src?: string | null
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizes = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-20 w-20 text-2xl',
}

export default function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const base = cn('shrink-0 rounded-full ring-1 ring-line select-none', sizes[size], className)

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={name} className={cn(base, 'object-cover')} />
    )
  }

  return (
    <span
      className={cn(base, 'inline-flex items-center justify-center bg-ink-700 font-semibold text-zinc-300')}
      aria-hidden="true"
    >
      {getInitials(name)}
    </span>
  )
}
