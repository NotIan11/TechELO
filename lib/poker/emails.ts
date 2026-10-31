/**
 * Poker notification emails. All senders swallow errors (email is best-effort)
 * and `sendEmail` no-ops without RESEND_API_KEY.
 */

import { appBaseUrl, escapeHtml, renderEmail, sendEmail } from '@/lib/email'
import { formatCents, ordinal } from './money'
import { formatPokerDateTime } from './periods'
import { sessionTitle } from './stats'
import type { RouteSupabase } from './server'
import type { PokerSessionKind } from './types'

interface SessionForEmail {
  id: string
  kind: PokerSessionKind
  title: string | null
  stakes: string | null
  variant: string | null
  is_official: boolean
  played_at: string
  host_id: string
}

interface EntryForEmail {
  user_id: string | null
  buy_in_cents: number
  cash_out_cents: number | null
  net_cents: number
  finish_place: number | null
  user: { university_email: string | null; first_name: string | null; display_name: string | null } | null
}

function firstName(u: EntryForEmail['user']): string {
  return u?.first_name || u?.display_name?.split(' ')[0] || 'there'
}

/**
 * After finalize (or a post-finalize edit): tell every non-host player their
 * line and ask them to confirm or dispute.
 */
export async function sendLedgerNotifications(
  supabase: RouteSupabase,
  sessionId: string,
  opts: { edited: boolean }
): Promise<void> {
  try {
    const [{ data: session }, { data: entries }] = await Promise.all([
      supabase
        .from('poker_sessions')
        .select('id, kind, title, stakes, variant, is_official, played_at, host_id')
        .eq('id', sessionId)
        .maybeSingle(),
      supabase
        .from('poker_entries')
        .select(
          'user_id, buy_in_cents, cash_out_cents, net_cents, finish_place, user:users(university_email, first_name, display_name)'
        )
        .eq('session_id', sessionId),
    ])
    if (!session) return
    const s = session as SessionForEmail
    const rows = (entries ?? []) as unknown as EntryForEmail[]

    const { data: host } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', s.host_id)
      .maybeSingle()
    const hostName = host?.display_name || 'Someone'
    const title = sessionTitle(s)
    const when = formatPokerDateTime(s.played_at)
    const base = appBaseUrl()
    const sessionUrl = base ? `${base}/poker/sessions/${s.id}` : '#'
    const inboxUrl = base ? `${base}/inbox` : '#'

    await Promise.allSettled(
      rows
        .filter((r) => r.user_id !== s.host_id && r.user?.university_email)
        .map(async (r) => {
          const net = formatCents(r.net_cents, { sign: true })
          const line =
            s.kind === 'tournament'
              ? `${r.finish_place ? `you placed ${ordinal(r.finish_place)} and ` : 'you '}cashed ${formatCents(r.cash_out_cents ?? 0)} on a ${formatCents(r.buy_in_cents)} entry (${net})`
              : `you bought in for ${formatCents(r.buy_in_cents)} and cashed out ${formatCents(r.cash_out_cents ?? 0)} (${net})`
          const verb = opts.edited ? 'edited the ledger for' : 'logged'
          const subject = opts.edited
            ? `${hostName} edited a poker session — please confirm again (${net})`
            : `${hostName} logged a poker session — you're ${net}`
          const text = `${hostName} ${verb} "${title}" (${when}). According to the ledger, ${line}. Confirm or dispute it at ${inboxUrl}.`
          const html = renderEmail({
            greetingName: firstName(r.user),
            paragraphs: [
              `${escapeHtml(hostName)} ${verb} <strong>${escapeHtml(title)}</strong> (${escapeHtml(when)}).`,
              `According to the ledger, ${escapeHtml(line)}.`,
              opts.edited
                ? 'The ledger changed, so your earlier confirmation was reset. Please take another look.'
                : 'If that looks right, confirm it in your inbox. If not, dispute it and the host will be notified.',
              `<a href="${escapeHtml(sessionUrl)}" style="color: #2563eb;">View the full ledger</a>`,
            ],
            cta: { label: 'Confirm or dispute in your inbox', url: inboxUrl },
          })
          await sendEmail(r.user!.university_email!, subject, text, html)
        })
    )
  } catch (err) {
    console.error('Poker ledger notification failed:', err)
  }
}

/** Tell the host someone disputed their ledger. */
export async function sendDisputeNotification(
  supabase: RouteSupabase,
  sessionId: string,
  disputerId: string,
  reason: string
): Promise<void> {
  try {
    const { data: session } = await supabase
      .from('poker_sessions')
      .select('id, kind, title, stakes, variant, is_official, played_at, host_id, host:users!host_id(university_email, first_name, display_name)')
      .eq('id', sessionId)
      .maybeSingle()
    if (!session) return
    const s = session as unknown as SessionForEmail & {
      host: { university_email: string | null; first_name: string | null; display_name: string | null } | null
    }
    if (!s.host?.university_email) return
    const { data: disputer } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', disputerId)
      .maybeSingle()
    const who = disputer?.display_name || 'A player'
    const title = sessionTitle(s)
    const base = appBaseUrl()
    const sessionUrl = base ? `${base}/poker/sessions/${s.id}` : '#'
    const subject = `${who} disputed your poker session`
    const text = `${who} disputed "${title}": "${reason}". Review and edit the session at ${sessionUrl}.`
    const html = renderEmail({
      greetingName: firstName(s.host),
      paragraphs: [
        `${escapeHtml(who)} disputed the ledger for <strong>${escapeHtml(title)}</strong>:`,
        `<em>“${escapeHtml(reason)}”</em>`,
        'The session still counts, but it shows as disputed until you edit it (which asks everyone to confirm again) or the player withdraws.',
      ],
      cta: { label: 'Review the session', url: sessionUrl },
    })
    await sendEmail(s.host.university_email, subject, text, html)
  } catch (err) {
    console.error('Poker dispute notification failed:', err)
  }
}

/**
 * After a host links a guest to an account: one summary email telling the
 * player their past sessions now count and are waiting in their inbox.
 */
export async function sendGuestLinkedNotification(
  supabase: RouteSupabase,
  guestId: string,
  userId: string,
  linkedById: string
): Promise<void> {
  try {
    const [{ data: guest }, { data: user }, { data: linker }, { data: rows }] = await Promise.all([
      supabase.from('poker_guests').select('name').eq('id', guestId).maybeSingle(),
      supabase.from('users').select('university_email, first_name, display_name').eq('id', userId).maybeSingle(),
      supabase.from('users').select('display_name').eq('id', linkedById).maybeSingle(),
      supabase
        .from('poker_entries')
        .select('id, session:poker_sessions!inner(status)')
        .eq('guest_id', guestId)
        .in('session.status', ['final', 'disputed']),
    ])
    if (!guest || !user?.university_email) return
    const n = (rows ?? []).length
    if (n === 0) return
    const hostName = linker?.display_name || 'A host'
    const base = appBaseUrl()
    const inboxUrl = base ? `${base}/inbox` : '#'
    const profileUrl = base ? `${base}/profile/${userId}` : '#'
    const sessionsWord = `${n} poker session${n === 1 ? '' : 's'}`
    const subject = `${hostName} linked ${sessionsWord} to your account`
    const text = `${hostName} had you on the ledger as "${guest.name}" before you signed up. ${sessionsWord} now count toward your record. Confirm or dispute each one at ${inboxUrl}.`
    const html = renderEmail({
      greetingName: user.first_name || user.display_name?.split(' ')[0] || 'there',
      paragraphs: [
        `${escapeHtml(hostName)} had you on the ledger as <strong>${escapeHtml(guest.name)}</strong> before you signed up.`,
        `${escapeHtml(sessionsWord)} now count toward your poker record. Each one is waiting in your inbox so you can confirm the numbers or dispute them.`,
        `<a href="${escapeHtml(profileUrl)}" style="color: #2563eb;">See your poker stats</a>`,
      ],
      cta: { label: 'Review them in your inbox', url: inboxUrl },
    })
    await sendEmail(user.university_email, subject, text, html)
  } catch (err) {
    console.error('Poker guest-link notification failed:', err)
  }
}
