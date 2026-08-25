'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Icon from '@/components/ui/Icon'
import TextLink from '@/components/ui/TextLink'

const TOAST_DURATION_MS = 5000

/** Nav bell with an orange count badge; toasts when the count goes up */
export default function InboxButton({ count }: { count: number }) {
  const [showToast, setShowToast] = useState(false)
  const lastCountRef = useRef<number | null>(null)
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (lastCountRef.current !== null && count > lastCountRef.current) {
      setShowToast(true)
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
      toastTimeoutRef.current = setTimeout(() => {
        setShowToast(false)
        toastTimeoutRef.current = null
      }, TOAST_DURATION_MS)
    }
    lastCountRef.current = count
  }, [count])

  useEffect(
    () => () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    },
    []
  )

  const badgeLabel = count > 99 ? '99+' : count

  return (
    <>
      <Link
        href="/inbox"
        aria-label={count > 0 ? `Inbox, ${count} pending` : 'Inbox'}
        className="relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-zinc-300 transition hover:bg-ink-700 hover:text-white"
      >
        <Icon name="inbox" className="h-5 w-5" />
        {count > 0 && (
          <span className="tabular absolute right-0.5 top-0.5 flex min-w-[1.15rem] items-center justify-center rounded-full bg-orange-500 px-1 py-0.5 text-[10px] font-bold leading-none text-black">
            {badgeLabel}
          </span>
        )}
      </Link>
      {showToast && (
        <div className="card fixed bottom-4 left-4 right-4 z-50 flex max-w-sm flex-col gap-2 p-4 sm:left-auto sm:right-4" role="alert">
          <p className="text-sm text-white">Something new is waiting in your inbox.</p>
          <TextLink href="/inbox" arrow="right" className="text-sm" onClick={() => setShowToast(false)}>
            View inbox
          </TextLink>
        </div>
      )}
    </>
  )
}
