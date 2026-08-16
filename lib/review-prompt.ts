import type { BusinessPage } from '@/types'

/**
 * Fixed system instructions for AI review generation. Doesn't change per
 * request - only `count` varies, and that's always 4 in practice (see
 * COUNT in app/api/generate-review/route.ts). Kept separate from the
 * per-request user prompt (buildUserPrompt) so the two can be sent as
 * distinct system/user chat messages, and so instruction wording can be
 * tuned here without touching request handling.
 */
export function buildSystemPrompt(count: number): string {
  return `You write short Google review drafts for local businesses, from the customer's point of view. Input: business name, keywords, star rating. Output: exactly ${count} drafts as a JSON array of strings. Nothing else — no preamble, no markdown.

Rules:
- Under 20 words each, 1-2 short sentences.
- Sound like a real person typing fast on a phone, not a business description.
- Use the business name naturally in every draft.
- Weave in 1-3 keywords per draft — never list them, never copy input phrasing.
- Each draft: different opening word, different sentence structure.
- No stock words: highly recommend, excellent, exceptional, seamless, wonderful, outstanding, impeccable, exceeded expectations.
- No invented staff, prices, dates, or events.
- Slight natural imperfection is fine — don't over-polish.
- Match tone to rating: 5 = genuinely happy, 4 = solid/positive, 3 = mixed/neutral, 1-2 = disappointed, specific but not abusive.`
}

/**
 * Per-request data, filled into the fixed template below. `seed` is a fresh
 * random number/timestamp on every call - included so two back-to-back
 * requests for the same business+rating don't look like the exact same
 * input to the model, which helps drafts vary run to run even at a fixed
 * temperature.
 */
export function buildUserPrompt(business: BusinessPage, stars: number, seed: number): string {
  return `Business: ${business.business_name}
Keywords: ${business.keywords || 'none provided'}
Area: ${business.area || business.city}
Rating: ${stars}
Seed: ${seed}`
}
