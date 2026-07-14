import Button from '@/components/ui/Button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="text-center">
        <p className="font-display text-7xl font-bold text-white/10">404</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-white">Scratch — page not found</h1>
        <p className="mt-2 text-sm text-slate-400">The page you&apos;re looking for doesn&apos;t exist.</p>
        <div className="mt-6">
          <Button href="/">Back to the leaderboard</Button>
        </div>
      </div>
    </div>
  )
}
