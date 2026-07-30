import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  const limited = await rateLimit(request, 'feedback', 10, 300) // 10 per 5 min per IP
  if (limited) return limited

  const supabase = createAdminClient()
  const body = await request.json()

  try {
    const { error } = await supabase.from('private_feedback').insert({
      business_id: body.business_id,
      stars_given: body.stars_given,
      feedback_text: body.feedback_text,
    })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Feedback error:', error)
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
  }
}
