import Card from './Card'
import Icon, { type IconName } from './Icon'

interface EmptyStateProps {
  icon?: IconName | React.ReactElement
  title: string
  description?: string
  action?: React.ReactNode
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Card padding="lg" className="bg-transparent">
      {icon && (
        <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded border border-line-strong text-zinc-300 [&>svg]:h-5 [&>svg]:w-5">
          {typeof icon === 'string' ? <Icon name={icon} /> : icon}
        </span>
      )}
      <h3 className="font-display text-2xl text-white">{title}</h3>
      {description && <p className="mt-2 max-w-md text-[15px] text-zinc-400">{description}</p>}
      {action && <div className="mt-6 flex flex-wrap gap-3">{action}</div>}
    </Card>
  )
}
