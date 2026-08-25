'use client'

import { usePathname } from 'next/navigation'
import MinimalShell from '@/components/layout/MinimalShell'

interface AuthShellProps {
  title: string
  subtitle?: string
  children: React.ReactNode
}

/** Centered card layout shared by all auth screens */
export default function AuthShell({ title, subtitle, children }: AuthShellProps) {
  const pathname = usePathname()
  const link = pathname.startsWith('/signup') ? { href: '/login', label: 'Sign in' } : { href: '/signup', label: 'Join' }
  return (
    <MinimalShell link={link}>
      <div className="card w-full max-w-md p-8">
        <h1 className="text-center font-display text-2xl font-bold tracking-tight text-white">{title}</h1>
        {subtitle && <p className="mt-2 text-center text-sm text-zinc-400">{subtitle}</p>}
        <div className="mt-7">{children}</div>
      </div>
    </MinimalShell>
  )
}
