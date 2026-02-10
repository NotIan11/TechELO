import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getInitialRating } from '@/lib/elo'
import { sendEmail } from '@/lib/email'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

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

    // Verify player2 exists and get display_name, email, first_name for notification
    const { data: player2 } = await supabase
      .from('users')
      .select('id, display_name, university_email, first_name')
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

    // Notify player2 by email
    if (player2?.university_email) {
      const { data: challenger } = await supabase
        .from('users')
        .select('display_name')
        .eq('id', user.id)
        .single()
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
      const gameLabel = game_type === 'ping_pong' ? 'ping pong' : game_type
      const inboxUrl = baseUrl ? `${baseUrl}/inbox` : '#'
      const challengerName = challenger?.display_name || 'Someone'
      const recipientName = player2.first_name || player2.display_name?.split(' ')[0] || 'there'
      const subject = `You've been challenged to a ${gameLabel} match`
      const text = `${challengerName} challenged you to a ${gameLabel} match. Open ${inboxUrl} to accept or decline.`
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: system-ui, sans-serif; line-height: 1.6; color: #111827; max-width: 560px; margin: 0 auto; padding: 24px;">
  <p style="margin: 0 0 16px;">Hello ${escapeHtml(recipientName)},</p>
  <p style="margin: 0 0 16px;">
    ${escapeHtml(challengerName)} has challenged you to a ${escapeHtml(gameLabel)} match. Please accept or decline in your inbox using the link below:
  </p>
  <p style="margin: 0 0 24px;">
    <a href="${escapeHtml(inboxUrl)}" style="color: #2563eb; text-decoration: underline;">Accept in inbox</a>
  </p>
  <p style="margin: 0; font-size: 0.875rem;">Tech ELO</p>
</body>
</html>
      `.trim()
      try {
        await sendEmail(player2.university_email, subject, text, html)
      } catch (emailErr) {
        console.error('Challenge email failed:', emailErr)
      }
    }

    return NextResponse.json({ match }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
