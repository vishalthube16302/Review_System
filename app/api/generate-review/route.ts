import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { rateLimit } from '@/lib/rate-limit'
import {
  DEFAULT_PROMPT_TEMPLATE,
  DRAFT_COUNT,
  buildReviewMessages,
  isLegacyDefaultTemplate,
  parseDrafts,
} from '@/lib/review-prompt'
import { buildFallbackDrafts } from '@/lib/review-fallback'
import { sanitizeChipList, sanitizeNote } from '@/lib/review-chips'

/**
 * Groq models. llama-3.3-70b-versatile (used until now) was shut down by Groq
 * on 16 Aug 2026 - every call has failed since, which is why customers only
 * ever saw the same backup lines. Models are env-overridable so the next
 * deprecation is a config change, not a code change:
 *   GROQ_MODEL          (default openai/gpt-oss-120b)
 *   GROQ_FALLBACK_MODEL (default openai/gpt-oss-20b)
 * Check https://console.groq.com/docs/deprecations periodically.
 */
const PRIMARY_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b'
const BACKUP_MODEL = process.env.GROQ_FALLBACK_MODEL || 'openai/gpt-oss-20b'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

type Message = { role: 'system' | 'user'; content: string }

async function callGroq(model: string, messages: Message[], timeoutMs: number): Promise<string[]> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY not configured')

  const isReasoningModel = model.startsWith('openai/gpt-oss')
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages,
      temperature: 1,
      top_p: 0.95,
      // Reasoning tokens count against the budget on gpt-oss, so leave room.
      max_completion_tokens: 1200,
      ...(isReasoningModel ? { reasoning_effort: 'low', include_reasoning: false } : {}),
    }),
    signal: AbortSignal.timeout(timeoutMs),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Groq ${model} ${res.status}: ${detail.slice(0, 200)}`)
  }

  const data = await res.json()
  const raw: string | undefined = data?.choices?.[0]?.message?.content
  if (!raw?.trim()) throw new Error(`Groq ${model}: empty response`)

  const drafts = parseDrafts(raw)
  if (drafts.length === 0) throw new Error(`Groq ${model}: could not parse drafts`)
  return drafts.slice(0, DRAFT_COUNT)
}

export async function POST(req: NextRequest) {
  // 30 per 5 min per IP - shops often share one WiFi IP, and "try different
  // wording" makes repeat calls normal.
  const limited = await rateLimit(req, 'generate-review', 30, 300)
  if (limited) return limited

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const business_id = typeof body.business_id === 'string' ? body.business_id : ''
  const stars = Number(body.stars)
  // ?debug=1 on the review page shows which model answered / why it fell back.
  // Never returns the prompt itself - prompt_template is private to the owner.
  const debug = body.debug === true
  if (!business_id || !Number.isInteger(stars) || stars < 1 || stars > 5) {
    return NextResponse.json({ error: 'business_id and a valid stars (1-5) are required' }, { status: 400 })
  }

  const highlights = sanitizeChipList(body.highlights)
  const improvements = sanitizeChipList(body.improvements)
  const note = sanitizeNote(body.note)

  const supabase = createAdminClient()
  const { data: business } = await supabase
    .from('business_pages')
    .select('id, business_name, keywords, area, city, prompt_template')
    .eq('id', business_id)
    .maybeSingle()

  if (!business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  // Untouched v1 templates carry the rules that made reviews repetitive, so
  // they're upgraded; anything an owner customised is respected as-is.
  const template = isLegacyDefaultTemplate(business.prompt_template)
    ? DEFAULT_PROMPT_TEMPLATE
    : business.prompt_template

  const messages = buildReviewMessages(template, {
    business_name: business.business_name,
    keywords: business.keywords || '',
    area: business.area || business.city,
    rating: stars,
    seed: Date.now(),
    highlights,
    improvements,
    customer_note: note,
  })

  const errors: string[] = []
  for (const [model, timeout] of [
    [PRIMARY_MODEL, 9000],
    [BACKUP_MODEL, 7000],
  ] as const) {
    try {
      const reviews = await callGroq(model, messages, timeout)
      return NextResponse.json({
        reviews,
        source: 'ai',
        ...(debug ? { model, errors } : {}),
      })
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err))
    }
  }

  // Never block the customer on an AI outage - but log loudly so it's noticed
  // (the old silent fallback hid a dead model for two months).
  console.error('[generate-review] AI unavailable, using fallback:', errors)
  const reviews = buildFallbackDrafts(
    { business_name: business.business_name, stars, highlights, improvements, note },
    DRAFT_COUNT
  )
  return NextResponse.json({
    reviews,
    source: 'template_fallback',
    ...(debug ? { errors } : {}),
  })
}
