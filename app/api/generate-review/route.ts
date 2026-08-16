import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getRandomTemplates } from '@/lib/templates'
import { rateLimit } from '@/lib/rate-limit'
import { buildReviewPrompt } from '@/lib/review-prompt'
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

  const prompt = buildReviewPrompt(business, stars, feedbackText, count)

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
  // 30 per 5 min per IP - generous enough for a busy shop where several
  // customers on the same shared WiFi scan around the same time (they'd
  // otherwise all share one IP and could trip a lower limit even under
  // completely normal, non-abusive use).
  const limited = await rateLimit(req, 'generate-review', 30, 300)
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
