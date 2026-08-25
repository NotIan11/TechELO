import Card from './Card'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Card padding="lg" className="text-center">
      {icon && <div className="mb-3 flex justify-center text-4xl">{icon}</div>}
      <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
      {description && <p className="mx-auto mt-1.5 max-w-sm text-sm text-zinc-400">{description}</p>}
      {action && <div className="mt-5 flex justify-center gap-3">{action}</div>}
    </Card>
  )
}
