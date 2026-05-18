import { createAdminClient } from '@/lib/supabase-server'
import Link from 'next/link'

export default async function AdminDashboard() {
  const supabase = createAdminClient()
  const now = new Date().toISOString()
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const [totalRes, activeRes, expiringRes, scansRes] = await Promise.all([
    supabase.from('business_pages').select('id', { count: 'exact', head: true }),
    supabase
      .from('business_pages')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .gt('expires_at', now),
    supabase
      .from('business_pages')
      .select('*')
      .eq('is_active', true)
      .gt('expires_at', now)
      .lt('expires_at', in30),
    supabase
      .from('scan_sessions')
      .select('id', { count: 'exact', head: true })
      .gt('scanned_at', new Date().toISOString().split('T')[0]),
  ])

  const { data: recent } = await supabase
    .from('business_pages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  const totalCount = totalRes.count ?? 0
  const activeCount = activeRes.count ?? 0
  const expiringCount = expiringRes.data?.length ?? 0
  const scansCount = scansRes.count ?? 0

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <Link
          href="/admin/customers/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          + Add Customer
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Businesses" value={totalCount} color="indigo" />
        <StatCard label="Active Links" value={activeCount} color="green" />
        <StatCard label="Expiring (30d)" value={expiringCount} color="yellow" />
        <StatCard label="Scans Today" value={scansCount} color="sky" />
      </div>

      {/* Expiring Soon Alert */}
      {expiringCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <h2 className="font-semibold text-yellow-800 mb-2">
            Expiring Soon ({expiringCount} businesses)
          </h2>
          {expiringRes.data?.map((b) => (
            <div key={b.id} className="flex justify-between text-sm py-1">
              <span>{b.business_name}</span>
              <span className="text-yellow-700">
                Expires: {new Date(b.expires_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Recent Customers */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Recent Customers</h2>
        <div className="bg-white rounded-xl shadow-sm">
          {recent?.map((b) => (
            <div key={b.id} className="flex items-center justify-between p-4 border-b border-slate-200 last:border-b-0">
              <div>
                <p className="font-medium text-slate-900">{b.business_name}</p>
                <p className="text-sm text-slate-500">{b.location}</p>
              </div>
              <Link
                href={`/admin/customers/${b.customer_id}`}
                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
              >
                Edit
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-700',
    green: 'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    sky: 'bg-sky-50 text-sky-700',
  }

  return (
    <div className={`rounded-xl p-5 ${colors[color]}`}>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm mt-1 opacity-80">{label}</div>
    </div>
  )
}
