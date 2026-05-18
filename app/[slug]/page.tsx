import { createAdminClient } from '@/lib/supabase-server'
import { notFound, redirect } from 'next/navigation'
import ReviewPageClient from './ReviewPageClient'

export default async function ReviewPage({ params }: { params: { slug: string } }) {
  const supabase = createAdminClient()

  const { data: business } = await supabase
    .from('business_pages')
    .select('*')
    .eq('slug', params.slug)
    .maybeSingle()

  if (!business) {
    notFound()
  }

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

  return (
    <div style={brandStyle}>
      <ReviewPageClient business={business} templates={templates ?? []} />
    </div>
  )
}
