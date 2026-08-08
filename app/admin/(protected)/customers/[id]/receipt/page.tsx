import { createAdminClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { PrintReceiptButton } from './PrintReceiptButton'

export default async function ReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ renewed_at?: string }>
}) {
  const { id } = await params
  const { renewed_at } = await searchParams

  if (!renewed_at) notFound()

  const supabase = createAdminClient()

  const { data: customer } = await supabase
    .from('customers')
    .select('business_name, owner_name, email, phone')
    .eq('id', id)
    .maybeSingle()

  const { data: rows } = await supabase
    .from('renewal_history')
    .select('*, business_pages(business_name, slug)')
    .eq('renewed_at', renewed_at)

  if (!customer || !rows || rows.length === 0) notFound()

  const first = rows[0]
  const receiptNumber = first.id.slice(0, 8).toUpperCase()

  return (
    <div className="max-w-lg mx-auto py-10 print:py-0">
      <div className="bg-white rounded-2xl shadow-sm p-8 print:shadow-none print:p-0">
        <div className="flex items-center justify-between mb-6 border-b border-slate-200 pb-6">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- static public asset */}
            <img src="/logo-icon.png" alt="Review Booster" className="w-10 h-10" />
            <div>
              <h1 className="text-xl font-bold text-slate-900">Review Booster</h1>
              <p className="text-xs text-slate-400">Payment Receipt</p>
            </div>
          </div>
          <div className="text-right text-sm">
            <p className="text-slate-500">Receipt #{receiptNumber}</p>
            <p className="text-slate-500">{new Date(first.renewed_at).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Billed To</p>
          <p className="font-semibold text-slate-900">{customer.business_name}</p>
          <p className="text-sm text-slate-500">{customer.owner_name}</p>
          {customer.email && <p className="text-sm text-slate-500">{customer.email}</p>}
        </div>

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="pb-2">Branch</th>
              <th className="pb-2">Plan</th>
              <th className="pb-2">Valid Until</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-100">
                <td className="py-2 text-slate-800">{r.business_pages?.business_name}</td>
                <td className="py-2 text-slate-600 capitalize">{r.plan}</td>
                <td className="py-2 text-slate-600">
                  {new Date(r.valid_until).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="bg-slate-50 rounded-lg p-4 flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide">Payment Method</p>
            <p className="font-medium text-slate-800 capitalize">
              {first.payment_method || 'Not specified'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 uppercase tracking-wide">Amount Paid</p>
            <p className="text-xl font-bold text-green-700">
              {first.amount_paid != null ? `₹${first.amount_paid}` : 'Not recorded'}
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-400 text-center">
          This is a manually-recorded receipt for offline payment. Not a tax invoice.
        </p>
      </div>

      <PrintReceiptButton />
    </div>
  )
}
