import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Runs only on /dashboard/* (see matcher below). Restaurant owners created
// with an auto-generated temp password (must_change_password = true) get
// bounced to the change-password page on every request until they set
// their own password - the change-password page itself is exempt so this
// doesn't become a redirect loop.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return response

  const { data: profile } = await supabase
    .from('profiles')
    .select('must_change_password')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.must_change_password) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard/change-password'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  // Covers /dashboard itself plus every sub-route except change-password.
  matcher: ['/dashboard', '/dashboard/((?!change-password).*)'],
}
