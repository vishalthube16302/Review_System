import { createAdminClient } from '@/lib/supabase-server'
import { getCurrentProfile } from '@/lib/auth-guard'
import Link from 'next/link'
import { StatusBadge } from '@/components/StatusBadge'
import { FeedbackCard } from '@/components/FeedbackCard'
import { ScansOverTimeChart, StarDistributionChart } from '@/components/DashboardCharts'
import type { Customer, BusinessPage } from '@/types'

interface ScanSession {
  id: string
  business_id: string
  stars_given: number
  was_submitted: boolean
  scanned_at: string
}

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

  const scanList = (scans ?? []) as ScanSession[]
  const totalReviews = scanList.length
  const submitted = scanList.filter((s) => s.was_submitted).length
  const avgStars =
    totalReviews > 0
      ? (scanList.reduce((sum, s) => sum + (s.stars_given || 0), 0) / totalReviews).toFixed(1)
      : '—'

  // Scans over the last 14 days, oldest to newest, for the trend chart.
  const dayBuckets: Record<string, number> = {}
  const today = new Date()
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    dayBuckets[key] = 0
  }
  scanList.forEach((s) => {
    const key = new Date(s.scanned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    if (key in dayBuckets) dayBuckets[key]++
  })
  const scansOverTime = Object.entries(dayBuckets).map(([date, scans]) => ({ date, scans }))

  // Star rating distribution, 1 through 5.
  const starCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  scanList.forEach((s) => {
    if (s.stars_given >= 1 && s.stars_given <= 5) starCounts[s.stars_given]++
  })
  const starDistribution = [1, 2, 3, 4, 5].map((star) => ({
    star: `${star}★`,
    count: starCounts[star],
  }))

  // Per-branch breakdown, for restaurants with more than one location.
  const branchStats = branches.map((b) => {
    const branchScans = scanList.filter((s) => s.business_id === b.id)
    const branchAvg =
      branchScans.length > 0
        ? (branchScans.reduce((sum, s) => sum + s.stars_given, 0) / branchScans.length).toFixed(1)
        : '—'
    return {
      ...b,
      scanCount: branchScans.length,
      submittedCount: branchScans.filter((s) => s.was_submitted).length,
      avgStars: branchAvg,
    }
  })

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

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-2">Scans - Last 14 Days</h2>
          <ScansOverTimeChart data={scansOverTime} />
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-2">Star Rating Breakdown</h2>
          <StarDistributionChart data={starDistribution} />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          Your Branches ({branches.length})
        </h2>
        <div className="bg-white rounded-xl shadow-sm divide-y divide-slate-200">
          {branchStats.length === 0 && (
            <p className="p-6 text-slate-500 text-sm">
              No branches set up yet - contact Review Booster support to get started.
            </p>
          )}
          {branchStats.map((b) => (
            <div key={b.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-slate-900">{b.business_name}</p>
                <p className="text-sm text-slate-500">{b.location}</p>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-slate-900">{b.scanCount}</div>
                  <div className="text-xs text-slate-400">scans</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-slate-900">{b.submittedCount}</div>
                  <div className="text-xs text-slate-400">submitted</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-slate-900">{b.avgStars}</div>
                  <div className="text-xs text-slate-400">avg ★</div>
                </div>
                <StatusBadge isActive={b.is_active} expiresAt={b.expires_at} />
                <Link
                  href={`/dashboard/branches/${b.id}/qr`}
                  className="text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Download QR
                </Link>
              </div>
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
            <FeedbackCard
              key={f.id}
              id={f.id}
              stars={f.stars_given}
              text={f.feedback_text}
              submittedAt={f.submitted_at}
              initialIsRead={f.is_read}
            />
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
