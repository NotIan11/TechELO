'use client'

import { useEffect, useState } from 'react'

const POLL_INTERVAL_MS = 30_000

/** Polls /api/inbox/count; shared by the nav bell and the mobile menu */
export function useInboxCount(): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    const fetchCount = async () => {
      try {
        const res = await fetch('/api/inbox/count')
        const data = await res.json()
        if (!cancelled) setCount(typeof data.count === 'number' ? data.count : 0)
      } catch {
        if (!cancelled) setCount(0)
      }
    }
    fetchCount()
    const interval = setInterval(fetchCount, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return count
}
