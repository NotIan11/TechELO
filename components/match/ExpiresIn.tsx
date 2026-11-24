'use client'

import { useState } from 'react'
import { CHALLENGE_EXPIRY_MS } from '@/lib/utils'

/** Time left before a challenge lapses. Drifts between server and client, hence the suppression. */
export default function ExpiresIn({ createdAt, suffix }: { createdAt: string; suffix?: string }) {
  const [now] = useState(() => Date.now())
  const left = Math.max(0, Math.ceil((new Date(createdAt).getTime() + CHALLENGE_EXPIRY_MS - now) / 60_000))
  return (
    <span suppressHydrationWarning>
      {left <= 1 ? 'expires in under a minute' : `expires in ${left}m`}
      {suffix}
    </span>
  )
}
