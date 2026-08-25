'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Icon from '@/components/ui/Icon'

interface SignOutButtonProps {
  variant?: 'ghost' | 'secondary'
  size?: 'sm' | 'md'
  /** Full-width menu-row style (mobile menu) */
  row?: boolean
  className?: string
}

export default function SignOutButton({ variant = 'ghost', size = 'md', row, className }: SignOutButtonProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (row) {
    return (
      <button
        type="button"
        onClick={handleSignOut}
        className={className ?? 'flex min-h-[44px] w-full items-center gap-2 px-1 text-left text-sm font-medium text-zinc-400 transition hover:text-white'}
      >
        <Icon name="logout" className="h-4 w-4" /> Sign out
      </button>
    )
  }

  return (
    <Button variant={variant} size={size} onClick={handleSignOut} type="button" className={className}>
      <Icon name="logout" className="h-4 w-4" /> Sign out
    </Button>
  )
}
