import { NextResponse } from 'next/server'
import { isUuid, validateGuestName } from '@/lib/poker/validation'
import { badRequest, firstRow, getRouteContext, readJson, rpcErrorResponse, serverError } from '@/lib/poker/server'
import type { PokerGuestRow } from '@/lib/poker/types'

/** Create a guest (no id) or rename one (id). Any signed-in host can create; only the creator or an officer can rename. */
export async function POST(request: Request) {
  try {
    const ctx = await getRouteContext()
    if (ctx.unauthorized) return ctx.unauthorized

    const body = (await readJson(request)) as { id?: unknown; name?: unknown } | null
    if (!body) return badRequest('Invalid request body.')
    if (body.id != null && !isUuid(body.id)) return badRequest('Invalid guest id.')
    const name = validateGuestName(body.name)
    if (!name.ok) return badRequest(name.error)

    const { data, error } = await ctx.supabase.rpc('upsert_poker_guest', {
      p_payload: { id: body.id ?? null, name: name.payload },
    })
    if (error) return rpcErrorResponse(error)

    return NextResponse.json({ guest: firstRow<PokerGuestRow>(data) }, { status: 200 })
  } catch (error) {
    return serverError(error)
  }
}
