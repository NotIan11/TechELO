import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getInitialRating } from '@/lib/elo'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { game_type, player2_id } = body

    if (!game_type || !player2_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (player2_id === user.id) {
      return NextResponse.json(
        { error: 'Cannot play against yourself' },
        { status: 400 }
      )
    }

    // Verify player2 exists
    const { data: player2 } = await supabase
      .from('users')
      .select('id')
      .eq('id', player2_id)
      .single()

    if (!player2) {
      return NextResponse.json(
        { error: 'Player 2 not found' },
        { status: 404 }
      )
    }

    // Get current ELO ratings
    const { data: player1Elo } = await supabase
      .from('elo_ratings')
      .select('rating')
      .eq('user_id', user.id)
      .eq('game_type', game_type)
      .single()

    const { data: player2Elo } = await supabase
      .from('elo_ratings')
      .select('rating')
      .eq('user_id', player2_id)
      .eq('game_type', game_type)
      .single()

    const player1Rating = player1Elo?.rating || getInitialRating()
    const player2Rating = player2Elo?.rating || getInitialRating()

    // Create match (initiator is player1 and auto-accepts start; only opponent needs to accept)
    const { data: match, error } = await supabase
      .from('matches')
      .insert({
        game_type,
        player1_id: user.id,
        player2_id,
        player1_elo_before: player1Rating,
        player2_elo_before: player2Rating,
        status: 'pending_start',
        player1_start_accepted: true,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ match }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
