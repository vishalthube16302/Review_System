import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireSuperAdmin } from '@/lib/auth-guard'
import { addDays } from 'date-fns'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError } = await requireSuperAdmin()
  if (authError) return authError

  const { id: customerId } = await params
  const supabase = createAdminClient()
  const body = await request.json()

  const days = Number(body.subscription_days)
  if (!days || days <= 0) {
    return NextResponse.json({ error: 'subscription_days must be a positive number' }, { status: 400 })
  }

  try {
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .maybeSingle()

    if (customerError) throw customerError
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // If they're still within an active subscription, extend from the
    // current expiry date rather than from today, so they don't lose the
    // remaining paid days. If it's already lapsed, start the new period
    // from today.
    const base = new Date(customer.paid_until) > new Date() ? new Date(customer.paid_until) : new Date()
    const newExpiry = addDays(base, days).toISOString()

    const { error: updateCustomerError } = await supabase
      .from('customers')
      .update({ paid_until: newExpiry, is_active: true })
      .eq('id', customerId)

    if (updateCustomerError) throw updateCustomerError

    // Renewal is a customer/account-level action - every branch under this
    // customer gets the same new expiry, extended together. Crucially, this
    // ONLY updates expires_at/is_active - the slug (and therefore the QR
    // code) is never touched, so existing printed QR codes keep working.
    const { data: branches, error: branchesError } = await supabase
      .from('business_pages')
      .select('id')
      .eq('customer_id', customerId)

    if (branchesError) throw branchesError

    if (branches && branches.length > 0) {
      const { error: updateBranchesError } = await supabase
        .from('business_pages')
        .update({ expires_at: newExpiry, is_active: true })
        .eq('customer_id', customerId)

      if (updateBranchesError) throw updateBranchesError

      // Computed once and reused for every row below, not called inside the
      // map - guarantees every branch's history row from this single renewal
      // shares the exact same renewed_at, so the receipt page can group them
      // together reliably by that timestamp.
      const renewedAt = new Date().toISOString()

      // One renewal_history row per branch (the table is keyed by
      // business_id), so each branch's renewal is individually auditable.
      const historyRows = branches.map((b) => ({
        business_id: b.id,
        plan: customer.plan,
        amount_paid: body.amount_paid ?? null,
        payment_method: body.payment_method ?? null,
        valid_from: base.toISOString(),
        valid_until: newExpiry,
        renewed_at: renewedAt,
      }))

      const { error: historyError } = await supabase.from('renewal_history').insert(historyRows)
      if (historyError) throw historyError

      return NextResponse.json({
        success: true,
        paid_until: newExpiry,
        receipt_url: `/admin/customers/${customerId}/receipt?renewed_at=${encodeURIComponent(renewedAt)}`,
      })
    }

    return NextResponse.json({ success: true, paid_until: newExpiry })
  } catch (error) {
    console.error('Error renewing subscription:', error)
    return NextResponse.json({ error: 'Failed to renew subscription' }, { status: 500 })
  }
}
