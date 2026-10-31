import { NextResponse } from 'next/server'
import { isUuid } from '@/lib/poker/validation'
import { badRequest, firstRow, getRouteContext, readJson, rpcErrorResponse, serverError } from '@/lib/poker/server'
import type { PokerGuestRow } from '@/lib/poker/types'

/** Undo a guest link; the rows go back to being guest-only. */
export async function POST(request: Request) {
  try {
    const ctx = await getRouteContext()
    if (ctx.unauthorized) return ctx.unauthorized

    const body = (await readJson(request)) as { guest_id?: unknown } | null
    if (!isUuid(body?.guest_id)) return badRequest('Missing guest id.')

    const { data, error } = await ctx.supabase.rpc('unlink_poker_guest', { p_guest_id: body!.guest_id })
    if (error) return rpcErrorResponse(error)

    return NextResponse.json({ guest: firstRow<PokerGuestRow>(data) }, { status: 200 })
  } catch (error) {
    return serverError(error)
  }
}
