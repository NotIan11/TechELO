import { NextResponse } from 'next/server'
import { isUuid } from '@/lib/poker/validation'
import { badRequest, firstRow, getRouteContext, readJson, rpcErrorResponse, serverError } from '@/lib/poker/server'
import type { PokerSessionRow } from '@/lib/poker/types'

export async function POST(request: Request) {
  try {
    const ctx = await getRouteContext()
    if (ctx.unauthorized) return ctx.unauthorized

    const body = (await readJson(request)) as { session_id?: unknown } | null
    if (!isUuid(body?.session_id)) return badRequest('Missing session id.')

    const { data, error } = await ctx.supabase.rpc('void_poker_session', { p_session_id: body!.session_id })
    if (error) return rpcErrorResponse(error)

    return NextResponse.json({ session: firstRow<PokerSessionRow>(data) }, { status: 200 })
  } catch (error) {
    return serverError(error)
  }
}
