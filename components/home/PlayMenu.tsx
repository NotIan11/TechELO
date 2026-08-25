'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import GameIcon from '@/components/ui/GameIcon'
import Icon from '@/components/ui/Icon'

/** The single "Play" button on the home hero: opens two rows, one per kind of game */
export default function PlayMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const row = (href: string, icon: React.ReactNode, label: string, sub: string) => (
    <Link
      href={href}
      onClick={() => setOpen(false)}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition hover:bg-ink-700"
    >
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-orange-400">{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-white">{label}</span>
        <span className="block text-xs text-zinc-500">{sub}</span>
      </span>
      <Icon name="chevron-right" className="ml-auto h-4 w-4 text-zinc-600" />
    </Link>
  )

  return (
    <div ref={ref} className="relative">
      <Button size="lg" type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu">
        Play <Icon name="chevron-down" className={open ? 'h-4 w-4 rotate-180 transition' : 'h-4 w-4 transition'} strokeWidth={2} />
      </Button>
      {open && (
        <div role="menu" className="card absolute left-0 top-full z-30 mt-2 w-72 p-1.5">
          {row('/matches/new', <GameIcon game="pool" size="md" />, 'Challenge someone', 'Pool or ping pong · rated')}
          {row('/poker/sessions/new', <GameIcon game="poker" size="md" />, 'Start a poker game', 'Cash game or tournament · ledger')}
        </div>
      )}
    </div>
  )
}
