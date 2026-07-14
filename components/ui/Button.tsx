import Link from 'next/link'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline'
type Size = 'sm' | 'md' | 'lg'

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-orange-400 to-orange-600 text-white font-semibold shadow-lg shadow-orange-500/20 hover:from-orange-400 hover:to-orange-500 active:translate-y-px',
  secondary:
    'bg-white/[0.06] border border-white/10 text-slate-200 hover:bg-white/[0.1] hover:text-white',
  ghost: 'text-slate-300 hover:bg-white/[0.06] hover:text-white',
  danger: 'bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25',
  success:
    'bg-emerald-500 text-emerald-950 font-semibold shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 active:translate-y-px',
  outline: 'border border-orange-400/40 text-orange-300 hover:bg-orange-400/10',
}

const sizeClasses: Record<Size, string> = {
  sm: 'min-h-[36px] px-3 text-sm rounded-lg gap-1.5',
  md: 'min-h-[44px] px-4 text-sm rounded-xl gap-2',
  lg: 'min-h-[48px] px-6 text-base rounded-xl gap-2',
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
