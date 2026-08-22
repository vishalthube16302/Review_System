import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireSuperAdmin, getCurrentProfile } from '@/lib/auth-guard'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ branchId: string }> }
) {
  const profile = await getCurrentProfile()
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

  // A restaurant_owner may only view branches under their own customer_id.
  if (profile.role === 'restaurant_owner' && data.customer_id !== profile.customer_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json(data)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ branchId: string }> }
) {
  const profile = await getCurrentProfile()
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { branchId } = await params
  const supabase = createAdminClient()
  const body = await request.json()

  const { data: existing, error: fetchError } = await supabase
    .from('business_pages')
    .select('customer_id')
    .eq('id', branchId)
    .maybeSingle()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
  }

  try {
    if (profile.role === 'restaurant_owner') {
      if (existing.customer_id !== profile.customer_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      // Restaurant owners can only ever edit their AI prompt template via
      // this endpoint - branding, active status, plan, etc. stay
      // super-admin-only, regardless of what else is in the request body.
      const { error } = await supabase
        .from('business_pages')
        .update({ prompt_template: body.prompt_template })
        .eq('id', branchId)

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    // Not a restaurant_owner acting on their own branch - must be super admin.
    const { error: authError } = await requireSuperAdmin()
    if (authError) return authError

    const { error } = await supabase
      .from('business_pages')
      .update({
        business_name: body.business_name,
        location: body.location,
        city: body.city,
        area: body.area,
        cuisine_type: body.cuisine_type,
        business_category: body.business_category,
        keywords: body.keywords,
        prompt_template: body.prompt_template,
        google_place_id: body.google_place_id,
        brand_color: body.brand_color,
        logo_url: body.logo_url,
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
