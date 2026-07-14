'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

const POLL_INTERVAL_MS = 30_000
const TOAST_DURATION_MS = 5000

export default function InboxButton() {
  const [count, setCount] = useState(0)
  const [showToast, setShowToast] = useState(false)
  const lastCountRef = useRef<number | null>(null)
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchCount = async () => {
    try {
      const res = await fetch('/api/inbox/count')
      const data = await res.json()
      const newCount = typeof data.count === 'number' ? data.count : 0
      if (lastCountRef.current !== null && newCount > lastCountRef.current) {
        setShowToast(true)
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
        toastTimeoutRef.current = setTimeout(() => {
          setShowToast(false)
          toastTimeoutRef.current = null
        }, TOAST_DURATION_MS)
      }
      lastCountRef.current = newCount
      setCount(newCount)
    } catch {
      setCount(0)
    }
  }

  useEffect(() => {
    fetchCount()
    const interval = setInterval(fetchCount, POLL_INTERVAL_MS)
    return () => {
      clearInterval(interval)
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    }
  }, [])

  const badgeLabel = count > 99 ? '99+' : count

  return (
    <>
      <Link
        href="/inbox"
        aria-label={count > 0 ? `Inbox, ${count} pending` : 'Inbox'}
        className="relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
          />
        </svg>
        {count > 0 && (
          <span className="absolute right-0.5 top-0.5 flex min-w-[1.15rem] items-center justify-center rounded-full bg-orange-500 px-1 py-0.5 text-[10px] font-bold leading-none text-white shadow-md shadow-orange-500/40">
            {badgeLabel}
          </span>
        )}
      </Link>
      {showToast && (
        <div
          className="card fixed bottom-4 left-4 right-4 z-50 flex max-w-sm flex-col gap-2 p-4 sm:left-auto sm:right-4"
          role="alert"
        >
          <p className="text-sm text-white">You have new items in your inbox.</p>
          <Link
            href="/inbox"
            className="inline-flex items-center text-sm font-semibold text-orange-400 hover:text-orange-300"
            onClick={() => setShowToast(false)}
          >
            View Inbox →
          </Link>
        </div>
      )}
    </>
  )
}
