import { NextResponse } from 'next/server'
import { isUuid } from '@/lib/poker/validation'
import { badRequest, firstRow, getRouteContext, readJson, rpcErrorResponse, serverError } from '@/lib/poker/server'
import type { PokerEntryRow } from '@/lib/poker/types'

export async function POST(request: Request) {
  try {
    const ctx = await getRouteContext()
    if (ctx.unauthorized) return ctx.unauthorized

    const body = (await readJson(request)) as { entry_id?: unknown } | null
    if (!isUuid(body?.entry_id)) return badRequest('Missing entry id.')

    const { data, error } = await ctx.supabase.rpc('withdraw_poker_dispute', { p_entry_id: body!.entry_id })
    if (error) return rpcErrorResponse(error)

    return NextResponse.json({ entry: firstRow<PokerEntryRow>(data) }, { status: 200 })
  } catch (error) {
    return serverError(error)
  }
}
