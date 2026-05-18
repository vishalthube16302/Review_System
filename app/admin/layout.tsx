import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
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
          } catch {}
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <span className="font-bold text-lg">ReviewBoost Admin</span>
        <div className="flex gap-6 text-sm">
          <Link href="/admin" className="hover:text-indigo-400">
            Dashboard
          </Link>
          <Link href="/admin/customers" className="hover:text-indigo-400">
            Customers
          </Link>
          <Link href="/admin/templates" className="hover:text-indigo-400">
            Templates
          </Link>
          <Link href="/admin/analytics" className="hover:text-indigo-400">
            Analytics
          </Link>
          <Link href="/admin/feedback" className="hover:text-indigo-400">
            Feedback
          </Link>
        </div>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  )
}
