import { createAdminClient } from '@/lib/supabase-server'
import { notFound, redirect } from 'next/navigation'
import ReviewPageClient from './ReviewPageClient'
import type { PublicBusinessInfo } from '@/types'

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = createAdminClient()

  const { data: business } = await supabase
    .from('business_pages')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (!business) notFound()

  if (!business.is_active || new Date(business.expires_at) < new Date()) {
    redirect('/expired')
  }

  const { data: templates } = await supabase
    .from('review_templates')
    .select('*')
    .eq('is_active', true)
    .order('stars', { ascending: false })

  const brandStyle = {
    '--brand': `#${business.brand_color || '4F46E5'}`,
    '--brand-light': `#${business.brand_color || '4F46E5'}22`,
  } as React.CSSProperties

  // Only pass the client component what it actually needs to render and
  // call the API - never the full row. That row includes internal/sensitive
  // fields (customer_id, plan, expires_at, keywords, prompt_template) that
  // would otherwise get embedded directly in the page sent to every
  // anonymous visitor who scans the QR code, with no ?debug=1 gate at all.
  const publicBusiness: PublicBusinessInfo = {
    id: business.id,
    business_name: business.business_name,
    location: business.location,
    logo_url: business.logo_url,
    google_place_id: business.google_place_id,
    area: business.area,
    city: business.city,
    cuisine_type: business.cuisine_type,
    keywords: business.keywords,
  }

  return (
    <div style={brandStyle}>
      <ReviewPageClient business={publicBusiness} templates={templates ?? []} />
    </div>
  )
}
