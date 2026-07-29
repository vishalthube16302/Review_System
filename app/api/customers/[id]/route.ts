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
