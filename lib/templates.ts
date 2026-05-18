import type { BusinessPage, ReviewTemplate } from '@/types'

export function fillTemplate(template: string, business: BusinessPage): string {
  return template
    .replace(/{name}/g, business.business_name)
    .replace(/{city}/g, business.city)
    .replace(/{location}/g, business.location)
    .replace(/{area}/g, business.area || business.city)
    .replace(/{cuisine}/g, business.cuisine_type)
}

export function getRandomTemplates(
  templates: ReviewTemplate[],
  stars: number,
  business: BusinessPage,
  count = 4
): string[] {
  const filtered = templates.filter((t) => t.stars === stars && t.is_active)
  const shuffled = filtered.sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count).map((t) => fillTemplate(t.template, business))
}
