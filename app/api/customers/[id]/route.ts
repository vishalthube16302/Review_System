import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireSuperAdmin, requireRestaurantAccess } from '@/lib/auth-guard'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { error: authError } = await requireRestaurantAccess(id)
  if (authError) return authError

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('customers')
    .select('*, business_pages(*)')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError } = await requireSuperAdmin()
  if (authError) return authError

  const { id } = await params
  const supabase = createAdminClient()
  const body = await request.json()

  try {
    const isActive = body.is_active === 'true' || body.is_active === true

    const { error } = await supabase
      .from('customers')
      .update({
        business_name: body.business_name,
        owner_name: body.owner_name,
        phone: body.phone,
        email: body.email,
        plan: body.plan,
        paid_until: body.paid_until,
        is_active: isActive,
      })
      .eq('id', id)

    if (error) throw error

    // Keep every branch's expiry in sync with the account-level date,
    // exactly like the Renew action does - a manual date edit here
    // shouldn't leave branches on a stale expiry. Never touches slug.
    const { error: branchError } = await supabase
      .from('business_pages')
      .update({ expires_at: body.paid_until, is_active: isActive })
      .eq('customer_id', id)

    if (branchError) throw branchError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating customer:', error)
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 })
  }
}

// Permanently deletes a customer and everything tied to it: branches
// (business_pages), feedback, scan sessions, renewal history, their
// profile row, AND their actual Supabase Auth login - not just the DB
// rows. Auth users aren't linked by a foreign key, so they're the one
// thing we have to clean up explicitly; everything else cascades at the
// database level (business_pages/profiles CASCADE from customers, and
// scan_sessions/renewal_history/private_feedback CASCADE from
// business_pages).
//
// Irreversible. The customer's review URL and QR code stop resolving
// immediately once this completes.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError } = await requireSuperAdmin()
  if (authError) return authError

  const { id } = await params
  const supabase = createAdminClient()

  const { data: customer, error: fetchError } = await supabase
    .from('customers')
    .select('id')
    .eq('id', id)
    .maybeSingle()

  if (fetchError || !customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
  }

  // Find and remove the login account first - it has no FK to `customers`,
  // so nothing else in this flow will clean it up for us.
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('customer_id', id)
    .eq('role', 'restaurant_owner')
    .maybeSingle()

  if (profile) {
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(profile.id)
    if (deleteAuthError) {
      // Not fatal - proceed with deleting the customer record anyway, but
      // log it so a leftover login can be found and cleaned up manually.
      console.error('Error deleting auth user during customer delete:', deleteAuthError)
    }
  }

  const { error: deleteError } = await supabase.from('customers').delete().eq('id', id)

  if (deleteError) {
    console.error('Error deleting customer:', deleteError)
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
