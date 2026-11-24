'use client'

import { useEffect, useRef } from 'react'
import Icon from '@/components/ui/Icon'
import { cn } from '@/lib/utils'

interface SheetProps {
  /** Accessible name, e.g. the player's name */
  label: string
  onClose: () => void
  /** Heading area to the left of the close button */
  header?: React.ReactNode
  /** Small screens: `bottom` hugs the bottom edge, `full` fills the screen (for sheets with a search box) */
  placement?: 'bottom' | 'full'
  className?: string
  children: React.ReactNode
}

/**
 * A panel that is a sheet over the page on small screens and sits inline, between
 * brighter rules, from `lg` up. Mount it to open and unmount it to close. Focus
 * moves into it on mount and returns to the opener on unmount; Escape closes.
 */
export default function Sheet({ label, onClose, header, placement = 'bottom', className, children }: SheetProps) {
  const ref = useRef<HTMLElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    ref.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        closeRef.current()
      }
    }
    document.addEventListener('keydown', onKey)
    // Lock page scroll only while it is an overlay (below lg)
    const overlay = window.matchMedia('(max-width: 1023px)').matches
    const prevOverflow = document.body.style.overflow
    if (overlay) document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      if (overlay) document.body.style.overflow = prevOverflow
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true })
    }
  }, [])

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/70 lg:hidden" aria-hidden="true" onClick={onClose} />
      <section
        ref={ref}
        role="dialog"
        aria-label={label}
        tabIndex={-1}
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 overflow-y-auto overscroll-contain border-t border-white/40 bg-ink-900 px-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-4 outline-none',
          placement === 'full' ? 'top-0 border-t-0' : 'max-h-[90dvh]',
          'lg:static lg:z-auto lg:max-h-none lg:overflow-visible lg:border-y lg:border-line-bright lg:bg-transparent lg:px-0 lg:pb-6 lg:pt-5',
          className
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">{header}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2.5 -mt-2 inline-flex h-11 w-11 shrink-0 items-center justify-center text-zinc-300 transition hover:text-white"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>
        {children}
      </section>
    </>
  )
}
