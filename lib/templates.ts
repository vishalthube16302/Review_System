import type { BusinessPage, ReviewTemplate } from '@/types'

export function fillTemplate(template: string, business: BusinessPage): string {
  return template
    .replace(/{name}/g, business.business_name)
    .replace(/{city}/g, business.city)
    .replace(/{location}/g, business.location)
    .replace(/{area}/g, business.area || business.city)
    .replace(/{cuisine}/g, business.cuisine_type)
}

function areaOrCity(business: BusinessPage): string {
  return business.area || business.city
}

// Builds a short "they {clause}" fragment from the comma-separated keywords
// field for the offline fallback templates (no model available to weave
// keywords naturally here, so keep it simple and safe).
//
// e.g. keywords "air compressors, oil-free compressors, material handling
// equipment" -> "handle air compressors and oil-free compressors"
function whatTheyDo(business: BusinessPage): string | null {
  if (!business.keywords) return null
  const keywords = business.keywords
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)

  if (keywords.length === 0) return null

  const picked = keywords.slice(0, 2)
  return `handle ${picked.join(' and ')}`
}

/**
 * Builds short, human-sounding review drafts without calling the AI - used
 * as the instant placeholder while the AI call is in flight, and as the
 * fallback if the AI call fails entirely.
 *
 * This used to just shuffle a handful of shared, generic DB rows (e.g.
 * "Best {cuisine} place around here") that never looked at what the
 * business actually does and were the same ~4-8 lines for every single
 * customer on the platform - which is exactly why reviews looked repetitive
 * and disconnected from the "what do they do" field. This version always
 * builds from the business's own name/area/description, so even the
 * fallback path reflects that field, and there's real sentence-structure
 * variety within a single call (not just word-swapping one template).
 */
export function getRandomTemplates(
  templates: ReviewTemplate[],
  stars: number,
  business: BusinessPage,
  count = 4
): string[] {
  const name = business.business_name
  const place = areaOrCity(business)
  const city = business.city
  const does = whatTheyDo(business)

  const five: string[] = does
    ? [
        `${name} in ${place} did a great job - they ${does}. Would go back.`,
        `Really happy with ${name}. They ${does}, and it showed.`,
        `${name} in ${city} is solid, they ${does}. Recommend to anyone nearby.`,
        `Good experience at ${name} - they ${does}, no complaints at all.`,
        `${name} was great, easily the best spot in ${place} for this.`,
        `Happy with the service at ${name} in ${city}. Will be back.`,
      ]
    : [
        `${name} was excellent, best in ${place}. Will definitely be back.`,
        `Great experience at ${name}, top spot in ${place}.`,
        `${name} in ${city} did a great job. Would recommend to anyone nearby.`,
        `Really happy with ${name} in ${place}. Great service overall.`,
      ]

  const four: string[] = does
    ? [
        `Had a decent visit to ${name} in ${place}. They ${does}, worth checking out.`,
        `${name} in ${city} was good overall, they ${does}. No major complaints.`,
        `Nice experience at ${name}. They ${does}, staff were helpful.`,
        `${name} in ${place} did fine, solid service for what they do.`,
        `Pretty good visit to ${name} in ${city}. Would go back.`,
      ]
    : [
        `Had a good time at ${name} in ${place}. Worth checking out.`,
        `Nice visit to ${name}. Staff were helpful.`,
        `${name} in ${city} was pretty good, no complaints. Would go back.`,
        `Good experience at ${name} in ${place}. Solid service overall.`,
      ]

  const pool = stars >= 5 ? five : stars === 4 ? four : [...five, ...four]

  // Shuffle so repeated visits to the same page don't always see the same
  // order, then top up from the DB-curated templates (if any exist and are
  // relevant) in case an admin wants extra variety beyond what's generated.
  const shuffled = [...pool].sort(() => Math.random() - 0.5)

  if (shuffled.length < count) {
    const extra = templates
      .filter((t) => t.stars === stars && t.is_active)
      .sort(() => Math.random() - 0.5)
      .map((t) => fillTemplate(t.template, business))
    shuffled.push(...extra)
  }

  return shuffled.slice(0, count)
}
