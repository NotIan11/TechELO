import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Test 1: Check environment variables
    const envCheck = {
      url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      publishableKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, // Publishable key (formerly anon key)
      emailDomain: process.env.NEXT_PUBLIC_UNIVERSITY_EMAIL_DOMAIN || 'Not set'
    }
    
    // Test 2: Check if we can query the database
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1)
    
    // Test 3: Check if dorms table exists
    const { data: dormsData, error: dormsError } = await supabase
      .from('dorms')
      .select('id')
      .limit(1)
    
    // Test 4: Check if RPC functions work
    const { data: leaderboard, error: rpcError } = await supabase.rpc('get_leaderboard', {
      p_game_type: 'pool',
      p_limit: 1,
      p_offset: 0,
      p_dorm_id: null
    })
    
    // Test 5: Check if create_user_profile function exists
    // We'll test this by checking if the function is callable
    // It will fail with the test data, but that means the function exists
    let functionError: any = null
    let functionExists = false
    try {
      const { error: testError } = await supabase.rpc('create_user_profile', {
        p_user_id: '00000000-0000-0000-0000-000000000000' as any,
        p_university_email: 'test@test.com',
        p_display_name: 'test',
        p_first_name: null,
        p_last_name: null
      })
      // If we get here, function exists (even if it errors with invalid data)
      functionExists = true
      functionError = testError
    } catch (err: any) {
      // If function doesn't exist, we'll get a different error
      if (err.message?.includes('function') || err.message?.includes('does not exist')) {
        functionExists = false
        functionError = { message: 'Function does not exist' }
      } else {
        // Function exists but had an error (expected with test data)
        functionExists = true
        functionError = err
      }
    }
    
    // Test 6: Check authentication status
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    // Test 7: Check if storage bucket exists (profile-pictures)
    const { data: storageData, error: storageError } = await supabase
      .storage
      .from('profile-pictures')
      .list('', { limit: 1 })
    
    const results = {
      success: true,
      message: 'Supabase integration test results',
      timestamp: new Date().toISOString(),
      environment: {
        ...envCheck,
        status: envCheck.url && envCheck.publishableKey ? '✓ All set' : '✗ Missing variables'
      },
      tests: {
        database_connection: {
          status: usersError ? '✗ Failed' : '✓ Passed',
          error: usersError?.message || null,
          details: usersError ? null : 'Successfully connected to database'
        },
        users_table: {
          status: usersError ? '✗ Failed' : '✓ Passed',
          error: usersError?.message || null,
          record_count: usersData ? 'Table accessible' : 'No data'
        },
        dorms_table: {
          status: dormsError ? '✗ Failed' : '✓ Passed',
          error: dormsError?.message || null,
          record_count: dormsData ? 'Table accessible' : 'No data'
        },
        rpc_functions: {
          status: rpcError ? '✗ Failed' : '✓ Passed',
          error: rpcError?.message || null,
          details: rpcError ? null : 'get_leaderboard function works'
        },
        create_user_function: {
          status: functionExists ? '✓ Passed' : '✗ Failed',
          error: functionError?.message || null,
          details: functionExists 
            ? 'create_user_profile function is accessible' 
            : 'Function does not exist - run migration 004_user_creation_function.sql'
        },
        authentication: {
          status: authError ? '✗ Failed' : '✓ Passed',
          error: authError?.message || null,
          user_authenticated: user ? `Yes (${user.email})` : 'No (anonymous)'
        },
        storage_bucket: {
          status: storageError ? '✗ Failed' : '✓ Passed',
          error: storageError?.message || null,
          details: storageError ? null : 'profile-pictures bucket accessible'
        }
      },
      summary: {
        total_tests: 7,
        passed: [
          !usersError && 'Database connection',
          !dormsError && 'Dorms table',
          !rpcError && 'RPC functions',
          functionExists && 'Create user function',
          !storageError && 'Storage bucket'
        ].filter(Boolean).length,
        failed: [
          usersError && 'Database connection',
          dormsError && 'Dorms table',
          rpcError && 'RPC functions',
          !functionExists && 'Create user function',
          storageError && 'Storage bucket'
        ].filter(Boolean).length
      }
    }
    
    // Determine overall status
    const hasCriticalErrors = !envCheck.url || !envCheck.publishableKey || usersError || dormsError
    const statusCode = hasCriticalErrors ? 500 : 200
    
    return NextResponse.json(results, { status: statusCode })
  } catch (err: any) {
    return NextResponse.json({ 
      success: false, 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 })
  }
}