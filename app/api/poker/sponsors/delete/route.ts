import { NextResponse } from 'next/server'
import { isUuid } from '@/lib/poker/validation'
import { badRequest, getRouteContext, readJson, rpcErrorResponse, serverError } from '@/lib/poker/server'

export async function POST(request: Request) {
  try {
    const ctx = await getRouteContext()
    if (ctx.unauthorized) return ctx.unauthorized

    const body = (await readJson(request)) as { id?: unknown } | null
    if (!isUuid(body?.id)) return badRequest('Missing sponsor id.')

    const { error } = await ctx.supabase.rpc('delete_poker_sponsor', { p_id: body!.id })
    if (error) return rpcErrorResponse(error)

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    return serverError(error)
  }
}
