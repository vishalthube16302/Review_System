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
  logo_url?: string
  brand_color: string
  plan: string
  is_active: boolean
  expires_at: string
  created_at: string
  last_renewed_at?: string
  renewal_count: number
}

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
