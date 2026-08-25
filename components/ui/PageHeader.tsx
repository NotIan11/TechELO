interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-white">{title}</h1>
        {subtitle && <p className="mt-1.5 text-zinc-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3 sm:shrink-0">{actions}</div>}
    </div>
  )
}
