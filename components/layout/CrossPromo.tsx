import { createClient } from '@/lib/supabase/server'
import { formatCents } from '@/lib/poker/money'
import { getMyPokerNet, getPokerPulse, getTablesPulse } from '@/lib/promo'
import PromoPanel from './PromoPanel'

export type PromoKind = 'poker' | 'tables'

const GAME_LABEL = { pool: 'pool', ping_pong: 'ping pong' } as const

/** "Meanwhile, at the other table" — rendered by AppShell above the footer */
export default async function CrossPromo({ kind }: { kind: PromoKind }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (kind === 'poker') {
    const pulse = await getPokerPulse(supabase)
    if (!pulse.available) return null
    const myNet = user ? await getMyPokerNet(supabase, user.id) : null
    const personal = myNet != null ? `You are ${formatCents(myNet, { sign: true, compact: true })} this term.` : undefined

    if (pulse.live) {
      return (
        <PromoPanel
          eyebrow="Meanwhile, at the poker table"
          live
          line={`Live now · ${pulse.live.title} · ${pulse.live.playerCount} player${pulse.live.playerCount === 1 ? '' : 's'} · ${formatCents(pulse.live.inPlayCents, { compact: true })} in play`}
          sub={personal}
          cta={{ href: `/poker/sessions/${pulse.live.id}`, label: 'Watch live' }}
        />
      )
    }
    if (pulse.term.sessions > 0) {
      const leader = pulse.term.leader
      return (
        <PromoPanel
          eyebrow="Meanwhile, at the poker table"
          line={`${formatCents(pulse.term.stakedCents, { compact: true })} changed hands in ${pulse.term.sessions} session${pulse.term.sessions === 1 ? '' : 's'} this term${leader ? ` · ${leader.name} is up ${formatCents(leader.netCents, { sign: true, compact: true })}` : ''}`}
          sub={personal}
          cta={user ? { href: '/poker/sessions/new', label: 'Start a game' } : { href: '/poker', label: 'See the ledger' }}
        />
      )
    }
    return (
      <PromoPanel
        eyebrow="Meanwhile, at the poker table"
        line="No sessions logged this term. Someone has to go first."
        cta={user ? { href: '/poker/sessions/new', label: 'Start a game' } : { href: '/poker', label: 'See how it works' }}
      />
    )
  }

  const tables = await getTablesPulse(supabase, user?.id ?? null)
  if (user) {
    if (tables.me && tables.me.length > 0) {
      return (
        <PromoPanel
          eyebrow="Meanwhile, at the table"
          line={`You are ${tables.me.map((m) => `#${m.rank} at ${GAME_LABEL[m.game]} · ${m.rating.toLocaleString('en-US')}`).join(' · ')}`}
          cta={{ href: '/matches/new', label: 'Challenge someone' }}
        />
      )
    }
    return (
      <PromoPanel
        eyebrow="Meanwhile, at the table"
        line="You are unranked at pool and ping pong. One confirmed match fixes that."
        cta={{ href: '/matches/new', label: 'Play your first match' }}
      />
    )
  }
  if (tables.leaders.length > 0) {
    return (
      <PromoPanel
        eyebrow="Meanwhile, at the table"
        line={tables.leaders.map((l) => `#1 at ${GAME_LABEL[l.game]} is ${l.name} · ${l.rating.toLocaleString('en-US')}`).join(' · ')}
        cta={{ href: '/leaderboard', label: 'See the rankings' }}
      />
    )
  }
  return (
    <PromoPanel
      eyebrow="Meanwhile, at the table"
      line="Nobody is ranked yet. The first confirmed match takes #1."
      cta={{ href: '/leaderboard', label: 'See the rankings' }}
    />
  )
}
