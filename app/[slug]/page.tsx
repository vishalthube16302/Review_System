import { Onest } from 'next/font/google'
import { createAdminClient } from '@/lib/supabase-server'
import { notFound, redirect } from 'next/navigation'
import ReviewPageClient from './ReviewPageClient'
import type { PublicBusinessInfo } from '@/types'

const onest = Onest({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

/** Picks white or dark text so any brand color stays readable on buttons. */
function readableInk(hex: string): string {
  const n = parseInt(hex.slice(0, 6).padEnd(6, '0'), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance > 0.45 ? '#16181D' : '#FFFFFF'
}

export default async function ReviewPage({ params }: { params: Promise<{ slug: string }> }) {
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

  const brand = (business.brand_color || '4F46E5').replace('#', '')
  const brandStyle = {
    '--brand': `#${brand}`,
    '--brand-soft': `#${brand}14`,
    '--brand-ink': readableInk(brand),
  } as React.CSSProperties

  // Only what the public page needs - never the full row (customer_id, plan,
  // expires_at, prompt_template stay server-side).
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
    business_category: business.business_category,
  }

  return (
    <div style={brandStyle} className={onest.className}>
      <ReviewPageClient business={publicBusiness} />
    </div>
  )
}
