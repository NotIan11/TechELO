import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getInboxCount } from '@/lib/inbox'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ count: 0 }, { status: 200 })
    }

    const count = await getInboxCount(supabase, user.id)
    return NextResponse.json({ count }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
