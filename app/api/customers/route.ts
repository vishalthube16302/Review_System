import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { uniqueSlug } from '@/lib/slug'
import { addDays } from 'date-fns'
import { requireSuperAdmin } from '@/lib/auth-guard'

export async function POST(request: Request) {
  const { error: authError } = await requireSuperAdmin()
  if (authError) return authError

  const supabase = createAdminClient()
  const body = await request.json()

  if (!body.email || !String(body.email).trim()) {
    return NextResponse.json(
      { error: 'Email is required - it becomes the customer\'s login username.' },
      { status: 400 }
    )
  }

  const DEFAULT_PASSWORD = 'Admin@123'

  try {
    // 1. Generate unique slug
    const slug = await uniqueSlug(body.business_name)

    // 2. Calculate expiry date - subscription_days is set explicitly by the
    // admin (quick-pick or custom number), not derived from the plan name.
    const days = Number(body.subscription_days) > 0 ? Number(body.subscription_days) : 180
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
        business_category: body.business_category,
        business_description: body.business_description,
        brand_color: body.brand_color,
        plan: body.plan,
        expires_at,
        is_active: true,
      })
      .select()
      .single()

    if (pageError) throw pageError

    // 5. Create the restaurant owner's login account. email_confirm is set to
    // true because this account is provisioned by us (super admin), not
    // self-signed-up, so there's no signup email to confirm.
    const { data: authUser, error: authCreateError } = await supabase.auth.admin.createUser({
      email: body.email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
    })

    if (authCreateError || !authUser?.user) {
      // The customer + branch rows are already committed at this point. We
      // don't roll them back - instead we surface a clear error so the admin
      // knows the login still needs to be created (e.g. email already in use
      // by another account).
      console.error('Error creating login account:', authCreateError)
      return NextResponse.json(
        {
          ...page,
          credentials: null,
          credentialsError:
            authCreateError?.message?.includes('already been registered')
              ? 'That email already has a login account. Create one manually with a different email, or reuse the existing account.'
              : 'Customer was created, but the login account could not be created automatically. Please create it manually in Supabase Auth.',
        },
        { status: 201 }
      )
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: authUser.user.id,
      role: 'restaurant_owner',
      customer_id: customer.id,
    })

    if (profileError) {
      console.error('Error creating profile:', profileError)
      return NextResponse.json(
        {
          ...page,
          credentials: null,
          credentialsError:
            'Login account was created but could not be linked to this customer. Please check Supabase.',
        },
        { status: 201 }
      )
    }

    return NextResponse.json({
      ...page,
      credentials: {
        username: body.email,
        password: DEFAULT_PASSWORD,
      },
    })
  } catch (error) {
    console.error('Error creating customer:', error)
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
  }
}

export async function GET() {
  const { error: authError } = await requireSuperAdmin()
  if (authError) return authError

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('customers')
    .select('*, business_pages(*)')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error listing customers:', error)
    return NextResponse.json({ error: 'Failed to load customers' }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
