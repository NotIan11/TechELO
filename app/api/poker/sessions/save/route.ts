import { NextResponse } from 'next/server'
import { validateSavePayload } from '@/lib/poker/validation'
import {
  badRequest,
  firstRow,
  getRouteContext,
  loadSessionMeta,
  readJson,
  rpcErrorResponse,
  serverError,
} from '@/lib/poker/server'
import { isUuid } from '@/lib/poker/validation'
import type { PokerSessionRow } from '@/lib/poker/types'

/** Autosave while a session is live (relaxed validation). */
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

    const parsed = validateSavePayload(body, meta.kind, { strict: false })
    if (!parsed.ok) return badRequest(parsed.error)
    const { session_id, ...payload } = parsed.payload

    const { data, error } = await supabase.rpc('save_poker_session', {
      p_session_id: session_id,
      p_payload: payload,
    })
    if (error) return rpcErrorResponse(error)

    return NextResponse.json({ session: firstRow<PokerSessionRow>(data) }, { status: 200 })
  } catch (error) {
    return serverError(error)
  }
}
