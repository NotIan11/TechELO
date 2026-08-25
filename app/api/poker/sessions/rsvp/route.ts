import { NextResponse } from 'next/server'
import { isUuid } from '@/lib/poker/validation'
import { badRequest, firstRow, getRouteContext, readJson, rpcErrorResponse, serverError } from '@/lib/poker/server'
import type { PokerSessionRow } from '@/lib/poker/types'

export async function POST(request: Request) {
  try {
    const ctx = await getRouteContext()
    if (ctx.unauthorized) return ctx.unauthorized

    const body = (await readJson(request)) as { session_id?: unknown; attending?: unknown } | null
    if (!isUuid(body?.session_id)) return badRequest('Missing session id.')
    if (typeof body?.attending !== 'boolean') return badRequest('Missing attending flag.')

    const { data, error } = await ctx.supabase.rpc('rsvp_poker_session', {
      p_session_id: body.session_id,
      p_attending: body.attending,
    })
    if (error) return rpcErrorResponse(error)

    return NextResponse.json({ session: firstRow<PokerSessionRow>(data) }, { status: 200 })
  } catch (error) {
    return serverError(error)
  }
}
