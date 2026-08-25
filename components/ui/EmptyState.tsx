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
    <Card padding="lg" className="text-center">
      {icon && (
        <span className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-orange-500/25 bg-orange-500/10 text-orange-400 [&>svg]:h-6 [&>svg]:w-6">
          {typeof icon === 'string' ? <Icon name={icon} /> : icon}
        </span>
      )}
      <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
      {description && <p className="mx-auto mt-1.5 max-w-sm text-sm text-zinc-400">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-3">{action}</div>}
    </Card>
  )
}
