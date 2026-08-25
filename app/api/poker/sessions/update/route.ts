import { NextResponse, after } from 'next/server'
import { isUuid, validateSavePayload } from '@/lib/poker/validation'
import {
  badRequest,
  firstRow,
  getRouteContext,
  loadSessionMeta,
  readJson,
  rpcErrorResponse,
  serverError,
} from '@/lib/poker/server'
import { sendLedgerNotifications } from '@/lib/poker/emails'
import type { PokerSessionRow } from '@/lib/poker/types'

/** Host edits a finalized session. Resets every ack/dispute and re-notifies. */
export async function POST(request: Request) {
  try {
    const ctx = await getRouteContext()
    if (ctx.unauthorized) return ctx.unauthorized
    const { supabase, user } = ctx

    const body = await readJson(request)
    const sessionId = (body as { session_id?: unknown } | null)?.session_id
    if (!isUuid(sessionId)) return badRequest('Missing session id.')

    const meta = await loadSessionMeta(supabase, sessionId)
    if (!meta) return badRequest('Session not found.', 404)
    if (meta.host_id !== user.id) return badRequest('Only the host can change this session.', 403)

    const parsed = validateSavePayload(body, meta.kind, { strict: true })
    if (!parsed.ok) return badRequest(parsed.error)
    const { session_id, ...payload } = parsed.payload

    const { data, error } = await supabase.rpc('update_poker_session', {
      p_session_id: session_id,
      p_payload: payload,
    })
    if (error) return rpcErrorResponse(error)

    after(() => sendLedgerNotifications(supabase, session_id, { edited: true }))

    return NextResponse.json({ session: firstRow<PokerSessionRow>(data) }, { status: 200 })
  } catch (error) {
    return serverError(error)
  }
}
