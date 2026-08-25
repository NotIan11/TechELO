import { NextResponse } from 'next/server'
import { isUuid } from '@/lib/poker/validation'
import { badRequest, firstRow, getRouteContext, readJson, rpcErrorResponse, serverError } from '@/lib/poker/server'
import type { PokerSessionRow } from '@/lib/poker/types'

/** Officer takes a scheduled official tournament live. */
export async function POST(request: Request) {
  try {
    const ctx = await getRouteContext()
    if (ctx.unauthorized) return ctx.unauthorized

    const body = (await readJson(request)) as { session_id?: unknown } | null
    if (!isUuid(body?.session_id)) return badRequest('Missing session id.')

    const { data, error } = await ctx.supabase.rpc('open_poker_session', { p_session_id: body!.session_id })
    if (error) {
      if (error.code === '23505') return rpcErrorResponse({ message: 'LIVE_SESSION_EXISTS' })
      return rpcErrorResponse(error)
    }

    return NextResponse.json({ session: firstRow<PokerSessionRow>(data) }, { status: 200 })
  } catch (error) {
    return serverError(error)
  }
}
