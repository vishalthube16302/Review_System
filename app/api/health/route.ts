import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

/**
 * Lightweight health check for uptime monitoring. Confirms both the
 * Worker itself and the database connection are alive - a Worker that
 * responds but can't reach Supabase is just as "down" for real customers.
 * No auth required - this endpoint reveals nothing sensitive.
 */
export async function GET() {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('customers').select('id').limit(1)

    if (error) {
      return NextResponse.json({ status: 'error', database: 'unreachable' }, { status: 503 })
    }

    return NextResponse.json({ status: 'ok', database: 'connected', time: new Date().toISOString() })
  } catch {
    return NextResponse.json({ status: 'error', database: 'unreachable' }, { status: 503 })
  }
}
