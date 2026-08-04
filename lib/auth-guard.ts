import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createAdminClient } from './supabase-server'

export interface Profile {
  id: string
  role: 'super_admin' | 'restaurant_owner'
  customer_id: string | null
  must_change_password: boolean
}

async function getSupabaseSession() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore in server components
          }
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  return session
}

/**
 * Fetches the logged-in user's role + scope (profile). Returns null if
 * there's no session, or if a session exists but has no profile row yet
 * (e.g. an auth user created directly in Supabase without being assigned
 * a role - treated as "no access" rather than silently trusting them).
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const session = await getSupabaseSession()
  if (!session) return null

  // Uses the service-role client deliberately here: we need to read the
  // profiles table to *determine* the role in the first place, before we
  // know whether RLS should let this user read anything at all.
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, role, customer_id, must_change_password')
    .eq('id', session.user.id)
    .maybeSingle()

  return (data as Profile | null) ?? null
}

/** For platform-wide routes: Super Admin only. */
export async function requireSuperAdmin() {
  const profile = await getCurrentProfile()

  if (!profile || profile.role !== 'super_admin') {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  return { profile }
}

/**
 * For restaurant-facing routes: a Restaurant Owner acting on their own
 * customer_id, OR a Super Admin (who can act on behalf of anyone).
 * Returns the customer_id this request is scoped to.
 */
export async function requireRestaurantAccess(requestedCustomerId?: string) {
  const profile = await getCurrentProfile()

  if (!profile) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  if (profile.role === 'super_admin') {
    return { profile, customerId: requestedCustomerId ?? null }
  }

  // A restaurant_owner can only ever act on their own customer_id, no matter
  // what customer_id was requested/passed in from the client.
  if (requestedCustomerId && requestedCustomerId !== profile.customer_id) {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return { profile, customerId: profile.customer_id }
}

/** @deprecated Use requireSuperAdmin() - kept temporarily so existing call
 * sites (admin-only mutation routes) keep compiling during the RBAC rollout. */
export async function requireAdmin() {
  return requireSuperAdmin()
}
