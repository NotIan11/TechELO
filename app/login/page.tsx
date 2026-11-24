import { Suspense } from 'react'
import LoginForm, { type LoginFigure } from '@/components/auth/LoginForm'
import { PageSpinner } from '@/components/ui/Spinner'
import { formatCents } from '@/lib/poker/money'
import { getPokerPulse, getTablesPulse } from '@/lib/promo'
import { createClient } from '@/lib/supabase/server'

/** The three live figures under the statement. Any that cannot be loaded are simply left out. */
async function loadFigures(): Promise<LoginFigure[]> {
  try {
    const supabase = await createClient()
    const [tables, poker] = await Promise.all([getTablesPulse(supabase, null), getPokerPulse(supabase)])
    const figures: LoginFigure[] = []
    const pool = tables.leaders.find((l) => l.game === 'pool')
    const pingPong = tables.leaders.find((l) => l.game === 'ping_pong')
    if (pool) figures.push({ label: '#1 at pool', value: String(pool.rating), name: pool.name })
    if (pingPong) figures.push({ label: '#1 at ping pong', value: String(pingPong.rating), name: pingPong.name })
    const leader = poker.available ? poker.term.leader : null
    if (leader && leader.netCents > 0) {
      figures.push({ label: 'Up most at poker this term', value: formatCents(leader.netCents, { sign: true, compact: true }), name: leader.name, tone: 'win' })
    }
    return figures
  } catch {
    return []
  }
}

export default async function LoginPage() {
  const figures = await loadFigures()
  return (
    <Suspense fallback={<PageSpinner />}>
      <LoginForm figures={figures} />
    </Suspense>
  )
}
