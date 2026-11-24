import MinimalShell from '@/components/layout/MinimalShell'
import Button from '@/components/ui/Button'

export default function NotFound() {
  return (
    <MinimalShell kicker={<span className="tabular">404</span>} title="Scratch. Page not found." lede="Nothing here. The tables are that way.">
      <div className="flex flex-wrap gap-3">
        <Button href="/">Home</Button>
        <Button href="/leaderboard" variant="secondary">
          Rankings
        </Button>
      </div>
    </MinimalShell>
  )
}
