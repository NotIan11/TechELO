import { NextResponse } from 'next/server'
import { validateStartPayload } from '@/lib/poker/validation'
import { badRequest, firstRow, getRouteContext, readJson, rpcErrorResponse, serverError } from '@/lib/poker/server'
import type { PokerSessionRow } from '@/lib/poker/types'

/** "Start game" / "Start tournament" / "Schedule official tournament" */
export async function POST(request: Request) {
  try {
    const ctx = await getRouteContext()
    if (ctx.unauthorized) return ctx.unauthorized
    const { supabase } = ctx

    const parsed = validateStartPayload(await readJson(request))
    if (!parsed.ok) return badRequest(parsed.error)

    const { data, error } = await supabase.rpc('start_poker_session', { p_payload: parsed.payload })
    if (error) {
      // Unique partial index: one live session per host (race with the pre-check)
      if (error.code === '23505') return rpcErrorResponse({ message: 'LIVE_SESSION_EXISTS' })
      return rpcErrorResponse(error)
    }

    const session = firstRow<PokerSessionRow>(data)
    return NextResponse.json({ session }, { status: 201 })
  } catch (error) {
    return serverError(error)
  }
}
