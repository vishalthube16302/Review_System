import { createAdminClient } from '@/lib/supabase-server'

export default async function AnalyticsPage() {
  const supabase = createAdminClient()

  const { data: scans } = await supabase
    .from('scan_sessions')
    .select(`
      id,
      stars_given,
      was_submitted,
      scanned_at,
      business_id,
      business_pages:business_id(business_name)
    `)
    .order('scanned_at', { ascending: false })
    .limit(100)

  const totalScans = scans?.length ?? 0
  const submittedScans = scans?.filter((s) => s.was_submitted).length ?? 0
  const conversionRate = totalScans > 0 ? Math.round((submittedScans / totalScans) * 100) : 0

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Analytics</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Scans" value={totalScans} color="indigo" />
        <StatCard label="Submitted" value={submittedScans} color="green" />
        <StatCard label="Conversion Rate" value={`${conversionRate}%`} color="sky" />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Recent Scans</h2>
        <div className="bg-white rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Business</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Rating</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Submitted</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Time</th>
              </tr>
            </thead>
            <tbody>
              {scans?.map((s) => (
                <tr key={s.id} className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50">
                  <td className="px-6 py-3 text-sm text-slate-900">
                    {s.business_pages?.business_name || 'Unknown'}
                  </td>
                  <td className="px-6 py-3 text-sm">{'⭐'.repeat(s.stars_given || 0)}</td>
                  <td className="px-6 py-3 text-sm">
                    {s.was_submitted ? (
                      <span className="text-green-600 font-medium">Yes</span>
                    ) : (
                      <span className="text-slate-400">No</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-600">
                    {new Date(s.scanned_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
