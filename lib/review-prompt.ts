import { getCategoryLabel, CATEGORY_REVIEW_FOCUS } from '@/lib/business-categories'
import type { BusinessPage } from '@/types'

/**
 * Builds the Groq prompt for AI review generation.
 *
 * Pulled out of app/api/generate-review/route.ts so prompt wording/rules can
 * be iterated on (SEO phrasing, tone rules, focus areas, future prompt
 * versions/A-B tests) without touching request handling, rate limiting, or
 * fallback logic in the route itself.
 */
export function buildReviewPrompt(
  business: BusinessPage,
  stars: number,
  feedbackText: string | undefined,
  count: number
): string {
  // Prefer the proper business_category/business_description fields; fall
  // back to the older cuisine_type field for branches created before those
  // existed, so nothing breaks for existing customers.
  const categoryLabel = business.business_category
    ? getCategoryLabel(business.business_category)
    : business.cuisine_type || 'business'
  const focusAreas = business.business_category
    ? CATEGORY_REVIEW_FOCUS[business.business_category] || CATEGORY_REVIEW_FOCUS.other
    : 'overall quality and service'
  const whatTheyDo = business.business_description
    ? ` They ${business.business_description.replace(/\.$/, '')}.`
    : ''

  return `You are a real customer who just visited a local business, quickly typing a Google review on your phone.

Business name: ${business.business_name}
Business type: ${categoryLabel}.${whatTheyDo}
Area/City: ${business.area || business.city}
Rating given: ${stars} out of 5 stars
${feedbackText ? `Customer's own notes about their visit: "${feedbackText}"` : 'The customer did not add extra notes.'}

Write ${count} different Google review drafts. Follow these rules exactly:

1. SHORT: 1-2 sentences per draft, under 20 words each. Real Google reviews are quick and casual, not essays.
2. PLAIN LANGUAGE: Write the way an ordinary person actually talks. Use simple, everyday words. Do NOT use typical "AI review" words like delightful, exceptional, impeccable, outstanding, wonderful experience, highly recommend, or exceeded expectations - these sound fake and robotic.
3. LEAD WITH WHAT THEY ACTUALLY DO: ${whatTheyDo ? `The single most important detail is what this business does - "${business.business_description}". At least 3 of the ${count} drafts must reference this specific detail directly, in the customer's own casual words, not the exact phrasing above. If that detail reads like a list of keywords or tags rather than a normal sentence, do NOT copy it as-is - rewrite it into how a real person would casually describe it.` : `No specific description was provided, so keep drafts general to a ${categoryLabel} business.`}
4. LOCAL SEO: Naturally include the business name in every draft, and the area/city (${business.area || business.city}) in at least half of them - phrased like a real person would say it, never forced or repetitive-sounding across drafts.
5. STAY RELEVANT TO THE BUSINESS TYPE: For a ${categoryLabel} business, real customers usually mention things like: ${focusAreas}. Only use these as backup if the business description above doesn't give you enough to work with - do not talk about food or dining unless the business type is actually food-related.
6. HONEST TONE: Match the tone to the star rating - ${stars >= 4 ? "genuinely happy but not over-the-top" : stars === 3 ? "just okay, mixed feelings" : "disappointed but not dramatic"}.
7. NO MADE-UP DETAILS: Never invent specific products, staff names, or events the customer didn't mention. Stay general to what this type of business does.
8. VARIETY IS MANDATORY: Each draft must use a different sentence structure and a different opening word. If two drafts start with the same word or read like the same sentence with names swapped, rewrite them.

Respond with ONLY a JSON array of ${count} strings, nothing else. Example format: ["review one", "review two"]`
}
