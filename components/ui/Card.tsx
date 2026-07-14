import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddings = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export default function Card({ padding = 'md', className, children, ...props }: CardProps) {
  return (
    <div className={cn('card', paddings[padding], className)} {...props}>
      {children}
    </div>
  )
}
