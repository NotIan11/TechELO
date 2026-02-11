import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isChallengeExpired } from '@/lib/utils'

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

    // Verify user is part of the match
    if (match.player1_id !== user.id && match.player2_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to accept this match' },
        { status: 403 }
      )
    }

    // Reject expired challenges and mark as challenge_expired
    if (match.status === 'pending_start' && isChallengeExpired(match.created_at)) {
      await supabase
        .from('matches')
        .update({ status: 'challenge_expired' })
        .eq('id', match_id)
      return NextResponse.json(
        { error: 'This challenge has expired.' },
        { status: 400 }
      )
    }

    // Update acceptance status
    const isPlayer1 = match.player1_id === user.id
    const updateData: any = {}
    
    if (isPlayer1) {
      updateData.player1_start_accepted = true
    } else {
      updateData.player2_start_accepted = true
    }

    // Check if both players have accepted
    const player1Accepted = isPlayer1 ? true : match.player1_start_accepted
    const player2Accepted = !isPlayer1 ? true : match.player2_start_accepted

    if (player1Accepted && player2Accepted) {
      updateData.status = 'in_progress'
      updateData.started_at = new Date().toISOString()
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
