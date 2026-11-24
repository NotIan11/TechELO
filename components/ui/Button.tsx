import Link from 'next/link'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline'
type Size = 'sm' | 'md' | 'lg'

const variantClasses: Record<Variant, string> = {
  // Orange is spent on exactly one thing per screen: the primary action
  primary: 'bg-orange-500 text-black font-medium hover:bg-orange-400 active:bg-orange-600',
  secondary: 'border border-line-strong text-white hover:border-line-bright',
  ghost: 'text-zinc-400 hover:text-white',
  danger: 'border border-line-strong text-loss hover:border-loss/60',
  success: 'border border-line-strong text-win hover:border-win/60',
  outline: 'border border-line-bright text-white hover:border-white/60',
}

const sizeClasses: Record<Size, string> = {
  sm: 'min-h-[40px] px-3 text-sm rounded gap-1.5',
  md: 'min-h-[44px] px-4 text-sm rounded gap-2',
  lg: 'min-h-[48px] px-6 text-[15px] rounded gap-2',
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
    'inline-flex items-center justify-center whitespace-nowrap font-normal transition disabled:pointer-events-none disabled:opacity-50',
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
