import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

/**
 * Given an email, returns the branding (business name, logo, color) for the
 * restaurant that email's account belongs to - purely cosmetic, so the
 * customer login screen can greet the right restaurant before password
 * entry. Always returns 200 with a `found` flag rather than 404/error, so
 * this endpoint can't be used to enumerate which emails have accounts.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')?.trim()

  if (!email) {
    return NextResponse.json({ found: false })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .rpc('lookup_customer_branding', { p_email: email })
    .maybeSingle<{ business_name: string; logo_url: string | null; brand_color: string | null }>()

  if (error || !data) {
    return NextResponse.json({ found: false })
  }

  return NextResponse.json({
    found: true,
    business_name: data.business_name,
    logo_url: data.logo_url,
    brand_color: data.brand_color || '4F46E5',
  })
}
