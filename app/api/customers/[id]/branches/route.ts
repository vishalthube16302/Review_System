import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { uniqueSlug, PLAN_DAYS } from '@/lib/slug'
import { addDays } from 'date-fns'
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
    .from('business_pages')
    .select('*')
    .eq('customer_id', id)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Failed to load branches' }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError } = await requireSuperAdmin()
  if (authError) return authError

  const { id: customer_id } = await params
  const supabase = createAdminClient()
  const body = await request.json()

  try {
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customer_id)
      .maybeSingle()

    if (customerError) throw customerError
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // New branches inherit the parent customer's plan/expiry by default unless overridden -
    // keeps a restaurant's branches in sync with its subscription rather than drifting.
    const plan = body.plan ?? customer.plan
    const days = PLAN_DAYS[plan] ?? 180
    const expires_at = customer.paid_until ?? addDays(new Date(), days).toISOString()

    const slug = await uniqueSlug(body.business_name)

    const { data: branch, error: branchError } = await supabase
      .from('business_pages')
      .insert({
        customer_id,
        slug,
        google_place_id: body.google_place_id,
        business_name: body.business_name,
        location: body.location,
        city: body.city,
        area: body.area,
        cuisine_type: body.cuisine_type,
        business_category: body.business_category,
        keywords: body.keywords,
        brand_color: body.brand_color || '4F46E5',
        plan,
        expires_at,
        is_active: true,
      })
      .select()
      .single()

    if (branchError) throw branchError

    return NextResponse.json(branch)
  } catch (error) {
    console.error('Error creating branch:', error)
    return NextResponse.json({ error: 'Failed to create branch' }, { status: 500 })
  }
}
