import MinimalShell from '@/components/layout/MinimalShell'
import Button from '@/components/ui/Button'

export default function NotFound() {
  return (
    <MinimalShell>
      <div className="text-center">
        <p className="font-display text-7xl font-bold tracking-tight text-white/10">404</p>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-white">Scratch. Page not found.</h1>
        <p className="mt-2 text-sm text-zinc-400">Nothing here. The tables are that way.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button href="/">Home</Button>
          <Button href="/leaderboard" variant="secondary">
            Rankings
          </Button>
        </div>
      </div>
    </MinimalShell>
  )
}
