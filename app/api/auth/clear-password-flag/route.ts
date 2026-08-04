import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getCurrentProfile } from '@/lib/auth-guard'

// Called right after the client successfully calls supabase.auth.updateUser
// to change the password. Restaurant owners can't update their own profiles
// table row directly (no RLS UPDATE policy for them, by design - see
// lockdown_security_definer_functions_and_bypass_policies), so this small
// admin-client route is the one exception, and it only ever flips this one
// flag for the caller's own profile.
export async function POST() {
  const profile = await getCurrentProfile()
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('profiles')
    .update({ must_change_password: false })
    .eq('id', profile.id)

  if (error) {
    console.error('Error clearing must_change_password:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
