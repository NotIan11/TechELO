import { NextResponse } from 'next/server'
import { isUuid } from '@/lib/poker/validation'
import { badRequest, getRouteContext, readJson, rpcErrorResponse, serverError } from '@/lib/poker/server'

/** Remove a guest that is not on any ledger. */
export async function POST(request: Request) {
  try {
    const ctx = await getRouteContext()
    if (ctx.unauthorized) return ctx.unauthorized

    const body = (await readJson(request)) as { id?: unknown } | null
    if (!isUuid(body?.id)) return badRequest('Missing guest id.')

    const { error } = await ctx.supabase.rpc('delete_poker_guest', { p_id: body!.id })
    if (error) return rpcErrorResponse(error)

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    return serverError(error)
  }
}
