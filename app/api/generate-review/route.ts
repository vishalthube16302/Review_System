import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getRandomTemplates } from '@/lib/templates'
import { rateLimit } from '@/lib/rate-limit'
import { getCategoryLabel, CATEGORY_REVIEW_FOCUS } from '@/lib/business-categories'
import type { BusinessPage } from '@/types'

// Free-tier AI provider. Swap provider by changing only this constant + callGroq().
const GROQ_MODEL = 'llama-3.3-70b-versatile'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

interface GenerateBody {
  business_id: string
  stars: number
  feedback_text?: string
}

async function callGroq(
  business: BusinessPage,
  stars: number,
  feedbackText: string | undefined,
  count: number
): Promise<string[]> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY not configured')

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

  const prompt = `You are a real customer who just visited a local business, quickly typing a Google review on your phone.

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

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.9,
      max_tokens: 500,
    }),
    // Keep this fast - customer is standing there waiting on their phone.
    signal: AbortSignal.timeout(6000),
  })

  if (!res.ok) throw new Error(`Groq request failed: ${res.status}`)

  const data = await res.json()
  const raw = data?.choices?.[0]?.message?.content?.trim()
  if (!raw) throw new Error('Empty Groq response')

  // Model may wrap in markdown fences despite instructions - strip defensively.
  const cleaned = raw.replace(/^```json\s*|^```\s*|```$/g, '').trim()
  const parsed = JSON.parse(cleaned)

  if (!Array.isArray(parsed) || parsed.some((s) => typeof s !== 'string')) {
    throw new Error('Unexpected Groq response shape')
  }

  return parsed.slice(0, count)
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, 'generate-review', 10, 300) // 10 per 5 min per IP
  if (limited) return limited

  let body: GenerateBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { business_id, stars, feedback_text } = body
  if (!business_id || !stars || stars < 1 || stars > 5) {
    return NextResponse.json({ error: 'business_id and a valid stars (1-5) are required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: business } = await supabase
    .from('business_pages')
    .select('*')
    .eq('id', business_id)
    .maybeSingle()

  if (!business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  const COUNT = 4

  try {
    const reviews = await callGroq(business, stars, feedback_text, COUNT)
    if (reviews.length === 0) throw new Error('Groq returned no reviews')
    return NextResponse.json({ reviews, source: 'ai' })
  } catch (err) {
    // Never block the customer flow on an AI hiccup - fall back to static templates.
    // Logged server-side so degraded AI availability is visible in deployment logs/alerts,
    // rather than silently shipping repetitive template text with no signal.
    console.error('[generate-review] Falling back to templates:', err)

    const { data: templates } = await supabase
      .from('review_templates')
      .select('*')
      .eq('stars', stars)
      .eq('is_active', true)

    const fallbackReviews = getRandomTemplates(templates ?? [], stars, business, COUNT)
    return NextResponse.json({ reviews: fallbackReviews, source: 'template_fallback' })
  }
}
