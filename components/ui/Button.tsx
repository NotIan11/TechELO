import Link from 'next/link'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline'
type Size = 'sm' | 'md' | 'lg'

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-orange-500 text-black font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-orange-400 active:bg-orange-600',
  secondary: 'border border-line bg-ink-700 text-white hover:border-line-strong hover:bg-ink-600',
  ghost: 'text-zinc-300 hover:bg-ink-700 hover:text-white',
  danger: 'border border-loss/20 bg-loss/10 text-loss hover:bg-loss/15',
  success: 'border border-win/20 bg-win/10 text-win hover:bg-win/15',
  outline: 'border border-orange-500/40 text-orange-400 hover:bg-orange-500/10',
}

const sizeClasses: Record<Size, string> = {
  sm: 'min-h-[36px] px-3 text-sm rounded-lg gap-1.5',
  md: 'min-h-[44px] px-4 text-sm rounded-lg gap-2',
  lg: 'min-h-[48px] px-6 text-base rounded-lg gap-2',
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  href?: string
  full?: boolean
}

export default function Button({
  variant = 'primary',
  size = 'md',
  href,
  full,
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(
    'inline-flex items-center justify-center whitespace-nowrap font-medium transition disabled:pointer-events-none disabled:opacity-50',
    variantClasses[variant],
    sizeClasses[size],
    full && 'w-full',
    className
  )

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    )
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  )
}
