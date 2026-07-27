import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentProfile } from '@/lib/auth-guard'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile()

  if (!profile) {
    redirect('/admin/login')
  }

  if (profile.role !== 'super_admin') {
    // A restaurant_owner (or any non-super_admin) has no business in /admin -
    // send them to their own dashboard instead of just blocking them.
    redirect('/dashboard')
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
          <form action="/api/auth/signout" method="post">
            <button className="text-slate-300 hover:text-white ml-2">Sign Out</button>
          </form>
        </div>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  )
}
