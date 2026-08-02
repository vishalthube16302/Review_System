export const BUSINESS_CATEGORIES = [
  { value: 'restaurant', label: 'Restaurant / Food & Beverage' },
  { value: 'hotel', label: 'Hotel / Hospitality' },
  { value: 'retail', label: 'Retail / Shop' },
  { value: 'manufacturing', label: 'Manufacturing / Industrial' },
  { value: 'healthcare', label: 'Healthcare / Clinic' },
  { value: 'salon', label: 'Salon / Spa' },
  { value: 'automotive', label: 'Automotive' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'education', label: 'Education / Coaching' },
  { value: 'professional_services', label: 'Professional Services (legal, finance, consulting)' },
  { value: 'home_services', label: 'Home Services (repair, cleaning, contractors)' },
  { value: 'other', label: 'Other' },
] as const

export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number]['value']

/**
 * What a real customer of this type of business typically praises in a
 * review - used to steer the AI prompt toward relevant, believable content
 * instead of generic (or worse, restaurant-flavored) language for every
 * business type.
 */
export const CATEGORY_REVIEW_FOCUS: Record<string, string> = {
  restaurant: 'taste, freshness, service speed, value for money, ambience',
  hotel: 'cleanliness, comfort, staff friendliness, amenities, location',
  retail: 'product selection, pricing, staff helpfulness, store experience',
  manufacturing: 'product quality, reliability, on-time delivery, technical support, pricing',
  healthcare: 'staff care and attentiveness, wait time, cleanliness, professionalism',
  salon: 'staff skill, cleanliness, ambience, value for money',
  automotive: 'service quality, honesty about pricing, turnaround time, staff explaining the work clearly',
  real_estate: 'professionalism, communication, transparency, follow-through',
  education: 'teaching quality, staff support, results, facilities',
  professional_services: 'expertise, responsiveness, clear communication, results',
  home_services: 'punctuality, quality of work, professionalism, fair pricing',
  other: 'overall service quality, professionalism, and value',
}

export function getCategoryLabel(category: string | null | undefined): string {
  return BUSINESS_CATEGORIES.find((c) => c.value === category)?.label ?? 'business'
}
