import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/profile'

  if (code) {
    const supabase = await createClient()
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      console.error('Auth exchange error:', exchangeError)
      return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin))
    }
    
    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('Get user error:', userError)
      return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin))
    }
    
    if (!user.email) {
      console.error('User has no email')
      return NextResponse.redirect(new URL('/login?error=no_email', requestUrl.origin))
    }

    // Verify email is confirmed
    if (!user.email_confirmed_at) {
      console.error('User email not confirmed')
      return NextResponse.redirect(new URL('/login?error=email_not_confirmed', requestUrl.origin))
    }

    // Check if user profile exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    // If user doesn't exist, create profile using database function
    if (!existingUser && checkError?.code === 'PGRST116') {
      const universityDomain = process.env.NEXT_PUBLIC_UNIVERSITY_EMAIL_DOMAIN || '@university.edu'
      const email = user.email.toLowerCase()
      
      // Validate university email
      if (!email.endsWith(universityDomain.toLowerCase())) {
        console.error('Invalid university email domain')
        return NextResponse.redirect(new URL(`/login?error=invalid_domain&domain=${encodeURIComponent(universityDomain)}`, requestUrl.origin))
      }

      // Get user metadata (first_name, last_name) from auth user
      const firstName = user.user_metadata?.first_name || ''
      const lastName = user.user_metadata?.last_name || ''
      const displayName = firstName && lastName 
        ? `${firstName} ${lastName}`.trim()
        : email.split('@')[0]

      // Use database function to create user profile (bypasses RLS)
      const { error: createError } = await supabase.rpc('create_user_profile', {
        p_user_id: user.id,
        p_university_email: email,
        p_display_name: displayName,
        p_first_name: firstName || null,
        p_last_name: lastName || null,
      })

      if (createError) {
        console.error('Create user profile error:', createError)
        // Still redirect to profile - user might exist but query failed
        // The app will handle missing profile gracefully
      }
    }

    // Check if user needs to complete signup (no first_name or last_name)
    const { data: userProfile } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single()

    if (!userProfile?.first_name || !userProfile?.last_name) {
      // Redirect to signup to complete profile
      return NextResponse.redirect(new URL('/signup?complete=true', requestUrl.origin))
    }

    // Check if user needs to set password (magic link users)
    // Users created with magic link won't have encrypted_password set
    // We can check this by attempting to get user metadata or checking auth factors
    // For now, we'll check if user was created recently and might not have password
    // A better approach would be to check auth factors, but for simplicity,
    // we'll let the login flow handle password checking
    
    return NextResponse.redirect(new URL(next, requestUrl.origin))
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin))
}
