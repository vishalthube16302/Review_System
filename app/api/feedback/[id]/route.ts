import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getCurrentProfile } from '@/lib/auth-guard'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getCurrentProfile()
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const supabase = createAdminClient()
  const body = await request.json()

  const { data: feedback, error: findError } = await supabase
    .from('private_feedback')
    .select('id, business_pages(customer_id)')
    .eq('id', id)
    .maybeSingle<{ id: string; business_pages: { customer_id: string } | null }>()

  if (findError || !feedback) {
    return NextResponse.json({ error: 'Feedback not found' }, { status: 404 })
  }

  // A restaurant_owner may only mark feedback for their own branches as read.
  if (
    profile.role === 'restaurant_owner' &&
    feedback.business_pages?.customer_id !== profile.customer_id
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error: updateError } = await supabase
    .from('private_feedback')
    .update({ is_read: body.is_read === true })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
