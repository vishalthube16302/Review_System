import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/auth-guard'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ branchId: string }> }
) {
  const { branchId } = await params
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('business_pages')
    .select('*')
    .eq('id', branchId)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ branchId: string }> }
) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const { branchId } = await params
  const supabase = createAdminClient()
  const body = await request.json()

  try {
    const { error } = await supabase
      .from('business_pages')
      .update({
        business_name: body.business_name,
        location: body.location,
        city: body.city,
        area: body.area,
        cuisine_type: body.cuisine_type,
        google_place_id: body.google_place_id,
        brand_color: body.brand_color,
        is_active: body.is_active === 'true' || body.is_active === true,
      })
      .eq('id', branchId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating branch:', error)
    return NextResponse.json({ error: 'Failed to update branch' }, { status: 500 })
  }
}
