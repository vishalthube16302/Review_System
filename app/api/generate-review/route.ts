import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getRandomTemplates } from '@/lib/templates'
import { rateLimit } from '@/lib/rate-limit'
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

  const prompt = `You are a real customer who just visited a local business, quickly typing a Google review on your phone.

Business name: ${business.business_name}
Type of business: ${business.cuisine_type}
Area/City: ${business.area || business.city}
Rating given: ${stars} out of 5 stars
${feedbackText ? `Customer's own notes about their visit: "${feedbackText}"` : 'The customer did not add extra notes.'}

Write ${count} different Google review drafts. Follow these rules exactly:

1. SHORT: 1-2 sentences per draft, under 25 words each. Real Google reviews are quick and casual, not essays.
2. PLAIN LANGUAGE: Write the way an ordinary person actually talks. Use simple, everyday words. Do NOT use typical "AI review" words like delightful, exceptional, impeccable, outstanding, wonderful experience, highly recommend, or exceeded expectations - these sound fake and robotic.
3. LOCAL SEO: Naturally include the business name in every draft, and the area/city (${business.area || business.city}) in at least half of them - phrased like a real person would say it (e.g. "best ${business.cuisine_type} spot in ${business.area || business.city}"), never forced or repetitive-sounding across drafts.
4. HONEST TONE: Match the tone to the star rating - ${stars >= 4 ? "genuinely happy but not over-the-top" : stars === 3 ? "just okay, mixed feelings" : "disappointed but not dramatic"}.
5. NO MADE-UP DETAILS: Never invent specific dishes, menu items, staff names, or events the customer didn't mention. Keep it general to the type of business.
6. VARIETY: Each draft should use different sentence structure and wording - no two should feel like templates with words swapped.

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
