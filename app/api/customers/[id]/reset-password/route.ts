import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireSuperAdmin } from '@/lib/auth-guard'
import { generateTempPassword } from '@/lib/generate-password'

// Generates a fresh random password for this customer's restaurant_owner
// login, sets must_change_password so they're forced to pick their own on
// next login, and returns the new password once for the admin to share.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError } = await requireSuperAdmin()
  if (authError) return authError

  const { id } = await params
  const supabase = createAdminClient()

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('customer_id', id)
    .eq('role', 'restaurant_owner')
    .maybeSingle()

  if (profileError || !profile) {
    return NextResponse.json(
      { error: 'No login account found for this customer yet.' },
      { status: 404 }
    )
  }

  const newPassword = generateTempPassword()

  const { error: updateError } = await supabase.auth.admin.updateUserById(profile.id, {
    password: newPassword,
  })

  if (updateError) {
    console.error('Error resetting password:', updateError)
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
  }

  await supabase.from('profiles').update({ must_change_password: true }).eq('id', profile.id)

  return NextResponse.json({ password: newPassword })
}
