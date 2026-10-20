/**
 * Quick-tap options shown on the public review page so the customer can say
 * what actually happened in two taps. These taps (plus their optional note)
 * are the ONLY facts the AI is allowed to write from - which is what makes
 * each review specific to that person instead of a generic invented one.
 *
 * Shared by the client (to render chips) and the server (to validate input).
 */

const POSITIVE_BY_CATEGORY: Record<string, string[]> = {
  restaurant: ['Tasty food', 'Quick service', 'Friendly staff', 'Good portions', 'Value for money', 'Clean place', 'Nice ambience'],
  hotel: ['Clean rooms', 'Comfortable stay', 'Helpful staff', 'Good location', 'Good food', 'Value for money'],
  retail: ['Good range', 'Fair prices', 'Helpful staff', 'Genuine products', 'Quick billing', 'Good advice'],
  manufacturing: ['Product quality', 'On-time delivery', 'Technical support', 'Fair pricing', 'Quick response', 'Proper installation'],
  healthcare: ['Caring staff', 'Short wait', 'Clean clinic', 'Explained clearly', 'Professional doctor'],
  salon: ['Skilled staff', 'Clean & hygienic', 'Relaxing', 'Good value', 'On time', 'Listened to me'],
  automotive: ['Honest pricing', 'Quick turnaround', 'Explained the work', 'Quality work', 'Friendly staff'],
  real_estate: ['Professional', 'Good communication', 'Transparent', 'Followed up', 'Good options'],
  education: ['Good teaching', 'Supportive staff', 'Good results', 'Doubts cleared', 'Good facilities'],
  professional_services: ['Expert advice', 'Quick response', 'Clear communication', 'Good results', 'Fair fees'],
  home_services: ['On time', 'Quality work', 'Professional', 'Fair price', 'Cleaned up after'],
  other: ['Good service', 'Friendly staff', 'Value for money', 'Quick response', 'Professional'],
}

const NEGATIVE_COMMON = ['Long wait', 'Pricing', 'Staff behaviour', 'Quality', 'Communication', 'Cleanliness']

const NEGATIVE_BY_CATEGORY: Record<string, string[]> = {
  restaurant: ['Food taste', 'Slow service', 'Order mistake'],
  hotel: ['Room condition', 'Check-in delay', 'Noise'],
  manufacturing: ['Delivery delay', 'After-sales support', 'Product issue'],
  automotive: ['Took too long', 'Unexpected charges'],
  home_services: ['Arrived late', 'Work not finished'],
  healthcare: ['Long wait', 'Rushed consultation'],
}

const MAX_CHIP_LENGTH = 32

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Turns the business's own keywords ("air compressors, AMC service") into chips. */
function keywordChips(keywords?: string | null): string[] {
  if (!keywords) return []
  return keywords
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 1 && k.length <= MAX_CHIP_LENGTH)
    .slice(0, 3)
    .map(titleCase)
}

export function getPositiveChips(category?: string | null, keywords?: string | null): string[] {
  const base = POSITIVE_BY_CATEGORY[category ?? ''] ?? POSITIVE_BY_CATEGORY.other
  return dedupe([...keywordChips(keywords), ...base]).slice(0, 8)
}

export function getNegativeChips(category?: string | null): string[] {
  return dedupe([...(NEGATIVE_BY_CATEGORY[category ?? ''] ?? []), ...NEGATIVE_COMMON]).slice(0, 8)
}

function dedupe(list: string[]): string[] {
  const seen = new Set<string>()
  return list.filter((item) => {
    const key = item.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Server-side cleanup of whatever the client sends. */
export function sanitizeChipList(input: unknown, max = 8): string[] {
  if (!Array.isArray(input)) return []
  return dedupe(
    input
      .filter((v): v is string => typeof v === 'string')
      .map((v) => v.replace(/[\r\n\t]+/g, ' ').trim().slice(0, 40))
      .filter(Boolean)
  ).slice(0, max)
}

export const NOTE_MAX_LENGTH = 400

export function sanitizeNote(input: unknown): string {
  if (typeof input !== 'string') return ''
  return input.replace(/\s+/g, ' ').trim().slice(0, NOTE_MAX_LENGTH)
}
