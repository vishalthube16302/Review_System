import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { uniqueSlug, PLAN_DAYS } from '@/lib/slug'
import { addDays } from 'date-fns'
import { requireAdmin } from '@/lib/auth-guard'

export async function POST(request: Request) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const supabase = createAdminClient()
  const body = await request.json()

  try {
    // 1. Generate unique slug
    const slug = await uniqueSlug(body.business_name)

    // 2. Calculate expiry date
    const days = PLAN_DAYS[body.plan] ?? 180
    const expires_at = addDays(new Date(), days).toISOString()

    // 3. Insert customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert({
        business_name: body.business_name,
        owner_name: body.owner_name,
        phone: body.phone,
        email: body.email,
        plan: body.plan,
        paid_until: expires_at,
        is_active: true,
      })
      .select()
      .single()

    if (customerError) throw customerError

    // 4. Insert business page
    const { data: page, error: pageError } = await supabase
      .from('business_pages')
      .insert({
        customer_id: customer.id,
        slug,
        google_place_id: body.google_place_id,
        business_name: body.business_name,
        location: body.location,
        city: body.city,
        area: body.area,
        cuisine_type: body.cuisine_type,
        brand_color: body.brand_color,
        plan: body.plan,
        expires_at,
        is_active: true,
      })
      .select()
      .single()

    if (pageError) throw pageError

    return NextResponse.json(page)
  } catch (error) {
    console.error('Error creating customer:', error)
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
  }
}

export async function GET() {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('business_pages')
    .select('*')
    .order('created_at', { ascending: false })

  return NextResponse.json(data ?? [])
}
