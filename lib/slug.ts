import { createAdminClient } from './supabase-server'

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export async function uniqueSlug(name: string): Promise<string> {
  const supabase = createAdminClient()
  let slug = generateSlug(name)
  let counter = 1

  while (true) {
    const { data } = await supabase
      .from('business_pages')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (!data) return slug
    slug = `${generateSlug(name)}-${++counter}`
  }
}

export const PLAN_DAYS: Record<string, number> = {
  basic: 90,
  standard: 180,
  premium: 365,
}
