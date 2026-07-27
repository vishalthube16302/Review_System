import { createAdminClient } from '@/lib/supabase-server'
import { getCurrentProfile } from '@/lib/auth-guard'
import { StatusBadge } from '@/components/StatusBadge'
import type { Customer, BusinessPage } from '@/types'

export default async function RestaurantDashboardPage() {
  // Layout already guarantees profile.role === 'restaurant_owner' with a
  // non-null customer_id before this page ever renders.
  const profile = await getCurrentProfile()
  const customerId = profile!.customer_id!

  const supabase = createAdminClient()

  const { data: customer } = await supabase
    .from('customers')
    .select('*, business_pages(*)')
    .eq('id', customerId)
    .maybeSingle<Customer>()

  const branches: BusinessPage[] = customer?.business_pages ?? []
  const branchIds = branches.map((b) => b.id)

  const { data: scans } = await supabase
    .from('scan_sessions')
    .select('*')
    .in('business_id', branchIds.length > 0 ? branchIds : ['00000000-0000-0000-0000-000000000000'])
    .order('scanned_at', { ascending: false })

  const { data: feedback } = await supabase
    .from('private_feedback')
    .select('*, business_pages(business_name)')
    .in('business_id', branchIds.length > 0 ? branchIds : ['00000000-0000-0000-0000-000000000000'])
    .order('submitted_at', { ascending: false })
    .limit(10)

  const totalReviews = scans?.length ?? 0
  const submitted = scans?.filter((s) => s.was_submitted).length ?? 0
  const avgStars =
    totalReviews > 0
      ? (scans!.reduce((sum, s) => sum + (s.stars_given || 0), 0) / totalReviews).toFixed(1)
      : '—'

  if (!customer) {
    return <div className="text-slate-500">Account not found. Contact support.</div>
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{customer.business_name}</h1>
        <div className="mt-2">
          <StatusBadge isActive={customer.is_active} expiresAt={customer.paid_until} />
          <span className="ml-3 text-sm text-slate-500">
            {customer.plan.charAt(0).toUpperCase() + customer.plan.slice(1)} plan · renews{' '}
            {new Date(customer.paid_until).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Scans" value={totalReviews} color="indigo" />
        <StatCard label="Reviews Submitted" value={submitted} color="green" />
        <StatCard label="Average Rating" value={avgStars} color="sky" />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          Your Branches ({branches.length})
        </h2>
        <div className="bg-white rounded-xl shadow-sm divide-y divide-slate-200">
          {branches.length === 0 && (
            <p className="p-6 text-slate-500 text-sm">
              No branches set up yet - contact ReviewBoost support to get started.
            </p>
          )}
          {branches.map((b) => (
            <div key={b.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-slate-900">{b.business_name}</p>
                <p className="text-sm text-slate-500">{b.location}</p>
              </div>
              <StatusBadge isActive={b.is_active} expiresAt={b.expires_at} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Recent Feedback</h2>
        <div className="space-y-3">
          {(!feedback || feedback.length === 0) && (
            <p className="text-slate-500 text-sm bg-white rounded-xl p-6 shadow-sm">
              No feedback yet. Feedback from customers who rate 1-3 stars will show up here.
            </p>
          )}
          {feedback?.map((f) => (
            <div key={f.id} className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-yellow-400">
              <p className="text-sm text-slate-600 mb-1">
                {'⭐'.repeat(f.stars_given)} · {f.business_pages?.business_name} ·{' '}
                {new Date(f.submitted_at).toLocaleDateString()}
              </p>
              <p className="text-slate-800 text-sm">{f.feedback_text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-700',
    green: 'bg-green-50 text-green-700',
    sky: 'bg-sky-50 text-sky-700',
  }
  return (
    <div className={`rounded-xl p-5 ${colors[color]}`}>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm mt-1 opacity-80">{label}</div>
    </div>
  )
}
