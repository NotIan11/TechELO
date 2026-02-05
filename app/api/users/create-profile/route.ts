import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: getUserError } = await supabase.auth.getUser()
    
    if (getUserError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Verify user exists in auth.users by checking their email
    if (!user.email) {
      return NextResponse.json({ error: 'User has no email' }, { status: 400 })
    }
    
    const body = await request.json()
    const { firstName, lastName } = body
    
    // Check if profile already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()
    
    if (existingProfile) {
      // Profile already exists, return success
      return NextResponse.json({ success: true, message: 'Profile already exists' })
    }
    
    const email = user.email.toLowerCase()
    const displayName = firstName && lastName 
      ? `${firstName.trim()} ${lastName.trim()}`.trim()
      : email.split('@')[0]
    
    // Wait a moment to ensure auth.users transaction is fully committed
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Use database function to create user profile (bypasses RLS)
    const { error: createError } = await supabase.rpc('create_user_profile', {
      p_user_id: user.id,
      p_university_email: email,
      p_display_name: displayName,
      p_first_name: firstName?.trim() || null,
      p_last_name: lastName?.trim() || null,
    })
    
    if (createError) {
      // If RPC fails, try direct insert as last resort (will fail if RLS blocks it)
      const { error: directError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          university_email: email,
          display_name: displayName,
          first_name: firstName?.trim() || null,
          last_name: lastName?.trim() || null,
        })
      
      if (directError) {
        return NextResponse.json({ 
          error: directError.message || createError.message,
          code: directError.code || createError.code,
          details: directError.details || createError.details,
          hint: directError.hint || createError.hint
        }, { status: 500 })
      }
    }
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
