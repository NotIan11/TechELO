import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { matchRpcErrorMessage } from '@/lib/utils'

// Challenger withdraws their own pending challenge.
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { match_id } = body

    if (!match_id) {
      return NextResponse.json(
        { error: 'Missing match_id' },
        { status: 400 }
      )
    }

    // Validated, race-safe state change (database function from migration 012)
    const { data: rpcRows, error: rpcError } = await supabase.rpc('cancel_match', {
      p_match_id: match_id,
    })

    if (!rpcError) {
      const updatedMatch = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows
      return NextResponse.json({ match: updatedMatch }, { status: 200 })
    }

    return NextResponse.json(
      { error: matchRpcErrorMessage(rpcError.message) },
      { status: 400 }
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
