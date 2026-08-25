/** Server-only helpers shared by the poker API routes. */

import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { pokerRpcErrorMessage, pokerRpcErrorStatus } from './errors'
import type { PokerSessionKind, PokerSessionStatus } from './types'

export type RouteSupabase = SupabaseClient

export async function getRouteContext(): Promise<
  | { supabase: RouteSupabase; user: { id: string }; unauthorized: null }
  | { supabase: RouteSupabase; user: null; unauthorized: NextResponse }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      supabase,
      user: null,
      unauthorized: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  return { supabase, user: { id: user.id }, unauthorized: null }
}

/** RPCs declared `RETURNS SETOF` come back as arrays; unwrap the first row. */
export function firstRow<T>(rows: unknown): T | null {
  if (Array.isArray(rows)) return (rows[0] as T) ?? null
  return (rows as T) ?? null
}

export function rpcErrorResponse(err: { code?: string; message?: string }): NextResponse {
  return NextResponse.json({ error: pokerRpcErrorMessage(err) }, { status: pokerRpcErrorStatus(err) })
}

export function badRequest(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

export function serverError(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : 'Internal server error'
  return NextResponse.json({ error: message || 'Internal server error' }, { status: 500 })
}

export interface SessionMeta {
  id: string
  kind: PokerSessionKind
  host_id: string
  status: PokerSessionStatus
  version: number
}

export async function loadSessionMeta(
  supabase: RouteSupabase,
  sessionId: string
): Promise<SessionMeta | null> {
  const { data } = await supabase
    .from('poker_sessions')
    .select('id, kind, host_id, status, version')
    .eq('id', sessionId)
    .maybeSingle()
  return (data as SessionMeta | null) ?? null
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return null
  }
}
