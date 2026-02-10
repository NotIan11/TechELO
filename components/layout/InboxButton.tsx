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
        className="relative inline-flex min-h-[44px] items-center rounded-md bg-gray-700 px-4 py-3 text-sm font-medium text-white hover:bg-gray-600"
      >
        Inbox
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-[1.25rem] items-center justify-center rounded-full bg-orange-500 px-1.5 py-0.5 text-xs font-bold text-white">
            {badgeLabel}
          </span>
        )}
      </Link>
      {showToast && (
        <div
          className="fixed bottom-4 left-4 right-4 z-50 flex max-w-sm flex-col gap-2 rounded-lg bg-gray-800 p-4 shadow-lg ring-1 ring-gray-700 sm:left-auto sm:right-4"
          role="alert"
        >
          <p className="text-sm text-white">You have new items in your inbox.</p>
          <Link
            href="/inbox"
            className="inline-flex min-h-[44px] items-center text-sm font-medium text-orange-400 hover:text-orange-300"
            onClick={() => setShowToast(false)}
          >
            View Inbox
          </Link>
        </div>
      )}
    </>
  )
}
