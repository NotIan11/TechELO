import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ count: 0 }, { status: 200 })
    }

    const { data: matches } = await supabase
      .from('matches')
      .select('id, status, player1_id, player2_id, player1_result_accepted, player2_result_accepted, player2_start_accepted')
      .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
      .in('status', ['pending_start', 'in_progress', 'pending_result'])

    let count = 0
    for (const match of matches ?? []) {
      const isPlayer1 = match.player1_id === user.id
      const isPlayer2 = match.player2_id === user.id
      if (match.status === 'pending_start' && isPlayer2 && !match.player2_start_accepted) {
        count += 1
      } else if (
        (match.status === 'in_progress' || match.status === 'pending_result') &&
        ((isPlayer1 && !match.player1_result_accepted) || (isPlayer2 && !match.player2_result_accepted))
      ) {
        count += 1
      }
    }

    return NextResponse.json({ count }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
