import { createAdminClient } from '@/lib/supabase-server'
import { StatusBadge } from '@/components/StatusBadge'
import Link from 'next/link'
import type { Customer } from '@/types'

export default async function CustomersPage() {
  const supabase = createAdminClient()

  const { data: customers } = await supabase
    .from('customers')
    .select('*, business_pages(*)')
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
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Branches</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Plan</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Renews / Expires</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(customers as Customer[] | null)?.map((c) => {
              const branches = c.business_pages ?? []
              return (
                <tr key={c.id} className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50">
                  <td className="px-6 py-3">
                    <p className="font-medium text-slate-900">{c.business_name}</p>
                    <p className="text-xs text-slate-500">{c.owner_name}</p>
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-600">
                    {branches.length} {branches.length === 1 ? 'branch' : 'branches'}
                  </td>
                  <td className="px-6 py-3 text-sm font-medium text-indigo-600 capitalize">{c.plan}</td>
                  <td className="px-6 py-3 text-sm text-slate-600">
                    {c.paid_until ? new Date(c.paid_until).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-3">
                    <StatusBadge isActive={c.is_active} expiresAt={c.paid_until} />
                  </td>
                  <td className="px-6 py-3 text-sm">
                    <Link
                      href={`/admin/customers/${c.id}`}
                      className="text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
