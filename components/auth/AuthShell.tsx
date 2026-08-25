import Link from 'next/link'
import Logo from '@/components/ui/Logo'

interface AuthShellProps {
  title: string
  subtitle?: string
  children: React.ReactNode
}

/** Centered card layout shared by all auth screens */
export default function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Link href="/" aria-label="Tech ELO home" className="mb-6">
        <Logo />
      </Link>
      <div className="card w-full max-w-md p-8">
        <h1 className="text-center font-display text-2xl font-bold text-white">{title}</h1>
        {subtitle && <p className="mt-2 text-center text-sm text-zinc-400">{subtitle}</p>}
        <div className="mt-7">{children}</div>
      </div>
      <p className="mt-6 text-center text-xs text-zinc-600">
        <Link href="/" className="hover:text-zinc-400">
          ← Back to the leaderboard
        </Link>
      </p>
    </div>
  )
}
