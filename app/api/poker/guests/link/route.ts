import { NextResponse, after } from 'next/server'
import { isUuid } from '@/lib/poker/validation'
import { badRequest, firstRow, getRouteContext, readJson, rpcErrorResponse, serverError } from '@/lib/poker/server'
import { sendGuestLinkedNotification } from '@/lib/poker/emails'
import type { PokerGuestRow } from '@/lib/poker/types'

/** Attach a guest to a registered account; every ledger row moves to that account and awaits their confirmation. */
export async function POST(request: Request) {
  try {
    const ctx = await getRouteContext()
    if (ctx.unauthorized) return ctx.unauthorized
    const { supabase, user } = ctx

    const body = (await readJson(request)) as { guest_id?: unknown; user_id?: unknown } | null
    if (!isUuid(body?.guest_id)) return badRequest('Missing guest id.')
    if (!isUuid(body?.user_id)) return badRequest('Choose the player to link.')
    const guestId = body!.guest_id as string
    const userId = body!.user_id as string

    const { data, error } = await supabase.rpc('link_poker_guest', { p_guest_id: guestId, p_user_id: userId })
    if (error) return rpcErrorResponse(error)

    after(() => sendGuestLinkedNotification(supabase, guestId, userId, user.id))

    return NextResponse.json({ guest: firstRow<PokerGuestRow>(data) }, { status: 200 })
  } catch (error) {
    return serverError(error)
  }
}
