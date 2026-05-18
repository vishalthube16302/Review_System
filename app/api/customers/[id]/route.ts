import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/auth-guard'

type RouteParams = {
  params: { id: string }
}

export async function GET(_request: Request, { params }: RouteParams) {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('business_pages')
    .select('*')
    .eq('customer_id', params.id)
    .single()

  return NextResponse.json(data)
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const supabase = createAdminClient()
  const body = await request.json()

  try {
    const { error } = await supabase
      .from('business_pages')
      .update({
        business_name: body.business_name,
        location: body.location,
        city: body.city,
        brand_color: body.brand_color,
        is_active: body.is_active === 'true' || body.is_active === true,
      })
      .eq('customer_id', params.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update error:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
