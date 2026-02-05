import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { match_id, winner_id } = body

    if (!match_id || !winner_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', match_id)
      .single()

    if (matchError || !match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      )
    }

    // Verify match is in correct status
    if (match.status !== 'in_progress' && match.status !== 'pending_result') {
      return NextResponse.json(
        { error: 'Match is not in a state to accept results' },
        { status: 400 }
      )
    }

    // Verify user is part of the match
    if (match.player1_id !== user.id && match.player2_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to accept this match' },
        { status: 403 }
      )
    }

    // Verify winner is one of the players
    if (winner_id !== match.player1_id && winner_id !== match.player2_id) {
      return NextResponse.json(
        { error: 'Winner must be one of the players' },
        { status: 400 }
      )
    }

    // Update acceptance status
    const isPlayer1 = match.player1_id === user.id
    const updateData: any = {
      status: 'pending_result',
    }
    
    if (isPlayer1) {
      updateData.player1_result_accepted = true
      // If player1 is setting the result, set winner
      if (!match.winner_id) {
        updateData.winner_id = winner_id
      }
    } else {
      updateData.player2_result_accepted = true
      // If player2 is setting the result, set winner
      if (!match.winner_id) {
        updateData.winner_id = winner_id
      }
    }

    // Check if both players have accepted and winner matches
    const player1Accepted = isPlayer1 ? true : match.player1_result_accepted
    const player2Accepted = !isPlayer1 ? true : match.player2_result_accepted
    const finalWinner = updateData.winner_id || match.winner_id

    // If both accepted and winner is set, complete the match
    if (player1Accepted && player2Accepted && finalWinner) {
      // Verify both players agree on winner
      if (match.winner_id && match.winner_id !== finalWinner) {
        // Dispute - winners don't match
        updateData.status = 'disputed'
      } else {
        updateData.status = 'completed'
        updateData.completed_at = new Date().toISOString()
      }
    }

    const { data: updatedMatch, error: updateError } = await supabase
      .from('matches')
      .update(updateData)
      .eq('id', match_id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ match: updatedMatch }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
