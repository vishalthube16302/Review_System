import { createAdminClient } from '@/lib/supabase-server'
import { StatusBadge } from '@/components/StatusBadge'
import Link from 'next/link'

export default async function CustomersPage() {
  const supabase = createAdminClient()

  const { data: customers } = await supabase
    .from('business_pages')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
        <Link
          href="/admin/customers/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          + Add Customer
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Business</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Location</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Plan</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Expires</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers?.map((c) => (
              <tr key={c.id} className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50">
                <td className="px-6 py-3">
                  <p className="font-medium text-slate-900">{c.business_name}</p>
                </td>
                <td className="px-6 py-3 text-sm text-slate-600">{c.location}</td>
                <td className="px-6 py-3 text-sm font-medium text-indigo-600">{c.plan}</td>
                <td className="px-6 py-3 text-sm text-slate-600">
                  {new Date(c.expires_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-3">
                  <StatusBadge isActive={c.is_active} expiresAt={c.expires_at} />
                </td>
                <td className="px-6 py-3 text-sm">
                  <Link
                    href={`/admin/customers/${c.customer_id}`}
                    className="text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
