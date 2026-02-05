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
    const { dorm_id } = body

    if (!dorm_id) {
      return NextResponse.json(
        { error: 'Missing dorm_id' },
        { status: 400 }
      )
    }

    // Verify dorm exists
    const { data: dorm, error: dormError } = await supabase
      .from('dorms')
      .select('id')
      .eq('id', dorm_id)
      .single()

    if (dormError || !dorm) {
      return NextResponse.json(
        { error: 'Dorm not found' },
        { status: 404 }
      )
    }

    // Update user's dorm
    const { error: updateError } = await supabase
      .from('users')
      .update({ dorm_id })
      .eq('id', user.id)

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
