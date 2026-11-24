'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Banner from '@/components/ui/Banner'
import Button from '@/components/ui/Button'
import ConfirmStrip from '@/components/ui/ConfirmStrip'
import { cn } from '@/lib/utils'

interface OpenMatchRowProps {
  matchId: string
  /** State in two or three words: "Playing now", "Challenge sent" */
  label: string
  /** White label when the next move is the viewer's, grey when it is not */
  mine?: boolean
  opponentName: string
  meta: React.ReactNode
  action: { kind: 'link'; label: string; quiet?: boolean } | { kind: 'withdraw' }
}

/** One open match as a ruled row: state, opponent, a quiet line, and the one thing to do next */
export default function OpenMatchRow({ matchId, label, mine, opponentName, meta, action }: OpenMatchRowProps) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const withdraw = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/matches/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: matchId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setBusy(false)
      setConfirming(false)
    }
  }

  return (
    <article className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-line py-4">
      <span className={cn('w-[110px] shrink-0 text-xs', mine ? 'text-white' : 'text-mute')}>{label}</span>
      <div className="min-w-0 flex-[1_1_280px]">
        <p className="text-base text-white">
          <Link href={`/matches/${matchId}`} className="hover:underline">
            {opponentName}
          </Link>
        </p>
        <p className="mt-0.5 text-[13px] text-mute">{meta}</p>
      </div>
      {action.kind === 'link' ? (
        <Button href={`/matches/${matchId}`} variant={action.quiet ? 'ghost' : 'outline'}>
          {action.label}
        </Button>
      ) : (
        !confirming && (
          <Button variant="ghost" type="button" onClick={() => setConfirming(true)}>
            Withdraw
          </Button>
        )
      )}
      {confirming && (
        <div className="basis-full">
          <ConfirmStrip inline className="mt-0" tone="danger" busy={busy} text="Withdraw this challenge?" onConfirm={withdraw} onBack={() => setConfirming(false)} />
        </div>
      )}
      {error && (
        <div className="basis-full">
          <Banner tone="error" compact>
            {error}
          </Banner>
        </div>
      )}
    </article>
  )
}
