'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { StatusBadge } from '@/components/StatusBadge'
import type { Customer, BusinessPage } from '@/types'

const PLANS = [
  { id: 'basic', label: 'Basic' },
  { id: 'standard', label: 'Standard' },
  { id: 'premium', label: 'Premium' },
]

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<Customer>>({})

  useEffect(() => {
    fetch(`/api/customers/${id}`)
      .then((r) => r.json())
      .then((c) => {
        setCustomer(c)
        setForm(c)
        setLoading(false)
      })
  }, [id])

  function set(k: keyof Customer, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    await fetch(`/api/customers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    setSaving(false)
    router.refresh()
  }

  if (loading || !customer) {
    return <div className="p-6 text-slate-500">Loading...</div>
  }

  const branches: BusinessPage[] = customer.business_pages ?? []

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-6">{customer.business_name}</h1>

        <form onSubmit={handleUpdate} className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Owner Name</label>
              <input
                type="text"
                value={form.owner_name || ''}
                onChange={(e) => set('owner_name', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input
                type="tel"
                value={form.phone || ''}
                onChange={(e) => set('phone', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email || ''}
              onChange={(e) => set('email', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Plan</label>
            <div className="grid grid-cols-3 gap-3">
              {PLANS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => set('plan', p.id)}
                  className={`p-3 rounded-lg border-2 text-center transition ${
                    form.plan === p.id
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-slate-200 bg-white hover:border-indigo-300'
                  }`}
                >
                  <div className="font-semibold text-slate-900">{p.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active || false}
                onChange={(e) => set('is_active', String(e.target.checked))}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-slate-700">Account Active</span>
            </label>
            <StatusBadge isActive={!!form.is_active} expiresAt={form.paid_until || customer.paid_until} />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Account Changes'}
          </button>
        </form>
      </div>

      <div>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Branches ({branches.length})
          </h2>
          <Link
            href={`/admin/customers/${id}/branches/new`}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            + Add Branch
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm divide-y divide-slate-200">
          {branches.length === 0 && (
            <p className="p-6 text-slate-500 text-sm">No branches yet. Add one to generate a QR code.</p>
          )}
          {branches.map((b) => (
            <div key={b.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-slate-900">{b.business_name}</p>
                <p className="text-sm text-slate-500">
                  {b.location} · reviewboost.in/{b.slug}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <StatusBadge isActive={b.is_active} expiresAt={b.expires_at} />
                <Link
                  href={`/admin/customers/${id}/branches/${b.id}`}
                  className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                >
                  Edit
                </Link>
                <Link
                  href={`/admin/customers/${id}/branches/${b.id}/qr`}
                  className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                >
                  QR
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
