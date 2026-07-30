import { NextResponse } from 'next/server'
import { createAdminClient } from './supabase-server'

/**
 * Returns the best-effort client IP from Cloudflare's edge headers.
 * cf-connecting-ip is set by Cloudflare on every request that reaches
 * the Worker, so this is reliable in production even though it falls
 * back to a constant locally (where that header won't be present).
 */
function getClientIp(request: Request): string {
  return request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown'
}

/**
 * Rate-limits a request. Returns null if the request is allowed, or a
 * ready-to-return 429 NextResponse if it should be blocked. Fails open
 * (allows the request) if the rate-limit check itself errors, so a
 * database hiccup never takes down the public review flow.
 */
export async function rateLimit(
  request: Request,
  endpoint: string,
  maxRequests: number,
  windowSeconds: number
): Promise<NextResponse | null> {
  const ip = getClientIp(request)
  const key = `${endpoint}:${ip}`

  try {
    const supabase = createAdminClient()
    const { data: allowed, error } = await supabase.rpc('check_rate_limit', {
      p_key: key,
      p_max_requests: maxRequests,
      p_window_seconds: windowSeconds,
    })

    if (error) {
      console.error('[rate-limit] check failed, allowing request:', error)
      return null
    }

    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests, please try again shortly.' },
        { status: 429 }
      )
    }

    return null
  } catch (err) {
    console.error('[rate-limit] unexpected error, allowing request:', err)
    return null
  }
}
