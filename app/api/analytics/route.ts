import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  const supabase = createAdminClient()
  const body = await request.json()

  try {
    const { error } = await supabase.from('scan_sessions').insert({
      business_id: body.business_id,
      stars_given: body.stars_given,
      template_index: body.template_index,
      was_submitted: body.was_submitted,
    })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json({ error: 'Failed to log scan' }, { status: 500 })
  }
}
