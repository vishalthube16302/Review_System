import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentProfile } from '@/lib/auth-guard'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getCurrentProfile()

  if (!profile) {
    redirect('/customer/login')
  }

  if (profile.role !== 'restaurant_owner') {
    // A super_admin has their own, more powerful panel - send them there
    // instead of showing them a restaurant-scoped view.
    redirect('/admin')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <span className="font-bold text-lg">ReviewBoost</span>
        <form action="/api/auth/signout" method="post">
          <button className="text-sm text-slate-300 hover:text-white">Sign Out</button>
        </form>
      </nav>
      <main className="p-6 max-w-5xl mx-auto">{children}</main>
    </div>
  )
}
