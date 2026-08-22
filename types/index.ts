export interface Customer {
  id: string
  business_name: string
  owner_name: string
  phone: string
  email?: string
  plan: 'basic' | 'standard' | 'premium'
  is_active: boolean
  paid_until: string
  created_at: string
  // Populated when fetched via the nested `customers.select('*, business_pages(*)')` query.
  // A customer can have multiple branches, each with its own slug/QR/location.
  business_pages?: BusinessPage[]
}

export interface BusinessPage {
  id: string
  customer_id: string
  slug: string
  google_place_id: string
  business_name: string
  location: string
  city: string
  area?: string
  cuisine_type: string
  business_category?: string
  keywords?: string
  prompt_template?: string
  logo_url?: string
  brand_color: string
  plan: string
  is_active: boolean
  expires_at: string
  created_at: string
  last_renewed_at?: string
  renewal_count: number
}

// Only the fields the public, unauthenticated review page
// (app/[slug]/page.tsx -> ReviewPageClient) actually needs to render, call
// /api/generate-review, and build the instant client-side fallback text via
// lib/templates.ts. Deliberately narrower than BusinessPage - the full row
// includes internal/sensitive fields (customer_id, plan, expires_at,
// business_category, prompt_template) that must never be sent to an
// anonymous visitor scanning a QR code. area/city/keywords/cuisine_type ARE
// included here since they're meant to appear in the customer-facing
// reviews anyway - no sensitivity issue there.
export type PublicBusinessInfo = Pick<
  BusinessPage,
  | 'id'
  | 'business_name'
  | 'location'
  | 'logo_url'
  | 'google_place_id'
  | 'area'
  | 'city'
  | 'cuisine_type'
  | 'keywords'
>

export interface ReviewTemplate {
  id: string
  stars: number
  template: string
  is_active: boolean
  created_at: string
}

export interface ScanSession {
  id: string
  business_id: string
  stars_given: number
  template_index?: number
  was_submitted: boolean
  scanned_at: string
}

export interface PrivateFeedback {
  id: string
  business_id: string
  stars_given: number
  feedback_text: string
  is_read: boolean
  submitted_at: string
}

export interface RenewalHistory {
  id: string
  business_id: string
  plan: string
  amount_paid: number
  valid_from: string
  valid_until: string
  renewed_at: string
}
