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
    const { match_id } = body

    if (!match_id) {
      return NextResponse.json(
        { error: 'Missing match_id' },
        { status: 400 }
      )
    }

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

    if (match.status !== 'pending_start') {
      return NextResponse.json(
        { error: 'Only pending challenges can be declined' },
        { status: 400 }
      )
    }

    // Only the opponent (player2) can decline
    if (match.player2_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the challenged player can decline' },
        { status: 403 }
      )
    }

    const { data: updatedMatch, error: updateError } = await supabase
      .from('matches')
      .update({ status: 'cancelled' })
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
