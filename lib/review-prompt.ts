/**
 * The entire AI prompt now lives per-business in business_pages.prompt_template
 * (DB column, DEFAULT set to this same text - see the migration). This file
 * only holds the starting/fallback text and the placeholder substitution -
 * there's no separate fixed "rules" builder anymore; the whole thing is
 * editable per customer, by the super admin or the restaurant owner.
 *
 * Available placeholders: {{business_name}}, {{keywords}}, {{area}},
 * {{rating}}, {{seed}}.
 */
export const DEFAULT_PROMPT_TEMPLATE = `You write short Google review drafts for local businesses, from the customer's point of view. Input: business name, keywords, star rating. Output: exactly 4 drafts as a JSON array of strings. Nothing else — no preamble, no markdown.

Rules:
- Under 20 words each, 1-2 short sentences.
- Sound like a real person typing fast on a phone, not a business description.
- Use the business name naturally in every draft.
- Weave in 1-3 keywords per draft — never list them, never copy input phrasing.
- Each draft: different opening word, different sentence structure.
- No stock words: highly recommend, excellent, exceptional, seamless, wonderful, outstanding, impeccable, exceeded expectations.
- No invented staff, prices, dates, or events.
- Slight natural imperfection is fine — don't over-polish.
- Match tone to rating: 5 = genuinely happy, 4 = solid/positive, 3 = mixed/neutral, 1-2 = disappointed, specific but not abusive.

Business: {{business_name}}
Keywords: {{keywords}}
Area: {{area}}
Rating: {{rating}}
Seed: {{seed}}`

interface PromptVars {
  business_name: string
  keywords: string
  area: string
  rating: number
  seed: number
}

/**
 * Fills {{placeholder}} tokens in a stored prompt_template with real
 * per-request values. Unknown/extra placeholders are left as-is rather than
 * throwing, since a customer's edited template shouldn't be able to crash
 * review generation over a typo'd variable name.
 */
export function fillPromptTemplate(template: string, vars: PromptVars): string {
  return template
    .replace(/\{\{business_name\}\}/g, vars.business_name)
    .replace(/\{\{keywords\}\}/g, vars.keywords || 'none provided')
    .replace(/\{\{area\}\}/g, vars.area)
    .replace(/\{\{rating\}\}/g, String(vars.rating))
    .replace(/\{\{seed\}\}/g, String(vars.seed))
}
