import { NextResponse, after } from 'next/server'
import { isUuid, validateDisputeReason } from '@/lib/poker/validation'
import { badRequest, firstRow, getRouteContext, readJson, rpcErrorResponse, serverError } from '@/lib/poker/server'
import { sendDisputeNotification } from '@/lib/poker/emails'
import type { PokerEntryRow } from '@/lib/poker/types'

export async function POST(request: Request) {
  try {
    const ctx = await getRouteContext()
    if (ctx.unauthorized) return ctx.unauthorized
    const { supabase, user } = ctx

    const body = (await readJson(request)) as { entry_id?: unknown; reason?: unknown } | null
    if (!isUuid(body?.entry_id)) return badRequest('Missing entry id.')
    const reason = validateDisputeReason(body?.reason)
    if (!reason.ok) return badRequest(reason.error)

    const { data, error } = await supabase.rpc('dispute_poker_entry', {
      p_entry_id: body!.entry_id,
      p_reason: reason.payload,
    })
    if (error) return rpcErrorResponse(error)

    const entry = firstRow<PokerEntryRow>(data)
    if (entry) {
      after(() => sendDisputeNotification(supabase, entry.session_id, user.id, reason.payload))
    }

    return NextResponse.json({ entry }, { status: 200 })
  } catch (error) {
    return serverError(error)
  }
}
