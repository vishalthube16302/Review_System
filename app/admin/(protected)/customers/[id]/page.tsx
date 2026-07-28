'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { StatusBadge } from '@/components/StatusBadge'
import { DurationPicker } from '@/components/DurationPicker'
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
  const [renewDays, setRenewDays] = useState(180)
  const [renewing, setRenewing] = useState(false)
  const [renewMessage, setRenewMessage] = useState('')

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

  async function handleRenew() {
    setRenewing(true)
    setRenewMessage('')

    const res = await fetch(`/api/customers/${id}/renew`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription_days: renewDays }),
    })

    const data = await res.json()

    if (res.ok) {
      setRenewMessage(
        `Renewed - now valid until ${new Date(data.paid_until).toLocaleDateString()}. QR codes unchanged.`
      )
      const refreshed = await fetch(`/api/customers/${id}`).then((r) => r.json())
      setCustomer(refreshed)
      setForm(refreshed)
    } else {
      setRenewMessage(data.error || 'Renewal failed.')
    }

    setRenewing(false)
  }

  if (loading || !customer) {
    return <div className="p-6 text-slate-500">Loading...</div>
  }

  const branches: BusinessPage[] = customer.business_pages ?? []

  const currentExpiry = new Date(customer.paid_until)
  const now = new Date()
  const isCurrentlyActive = currentExpiry > now
  const daysRemaining = Math.ceil((currentExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  // Mirrors the backend's rule exactly: if still active, the renewal adds
  // days on top of the current expiry (no days lost); if already lapsed,
  // the new period starts counting from today.
  const renewalBaseDate = isCurrentlyActive ? currentExpiry : now
  const newExpiryPreview = new Date(renewalBaseDate)
  newExpiryPreview.setDate(newExpiryPreview.getDate() + renewDays)
  const dateFormat: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">{customer.business_name}</h1>
        <p className="text-sm text-slate-500 mb-6">
          Customer since {new Date(customer.created_at).toLocaleDateString('en-US', dateFormat)}
        </p>

        <div className="bg-white rounded-2xl p-5 shadow-sm mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Subscription Status</p>
            <p className="text-lg font-semibold text-slate-900">
              {isCurrentlyActive
                ? `Active - valid until ${currentExpiry.toLocaleDateString('en-US', dateFormat)}`
                : `Expired ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? '' : 's'} ago`}
            </p>
            {isCurrentlyActive && (
              <p className="text-sm text-slate-500 mt-0.5">{daysRemaining} days remaining</p>
            )}
          </div>
          <StatusBadge isActive={customer.is_active} expiresAt={customer.paid_until} />
        </div>

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

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Renew Subscription</h2>
        <p className="text-sm text-slate-500 mb-4">
          Extends this account and all its branches. Existing QR codes and review links are
          never changed by a renewal.
        </p>
        <DurationPicker value={renewDays} onChange={setRenewDays} />

        <div className="mt-3 bg-slate-50 rounded-lg p-3 text-sm space-y-1">
          <p className="text-slate-500">
            {isCurrentlyActive
              ? `Still active, so renewal adds on top of the current expiry (no days lost):`
              : `Already expired, so the new period starts counting from today:`}
          </p>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-slate-500">
                {isCurrentlyActive ? 'Current expiry:' : 'Today:'}
              </span>{' '}
              <span className="font-medium text-slate-800">
                {renewalBaseDate.toLocaleDateString('en-US', dateFormat)}
              </span>
            </div>
            <div className="text-slate-300">+ {renewDays}d →</div>
            <div>
              <span className="text-slate-500">New expiry:</span>{' '}
              <span className="font-semibold text-green-700">
                {newExpiryPreview.toLocaleDateString('en-US', dateFormat)}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleRenew}
          disabled={renewing}
          className="w-full mt-4 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
        >
          {renewing
            ? 'Renewing...'
            : `Renew for ${renewDays} days (until ${newExpiryPreview.toLocaleDateString('en-US', dateFormat)})`}
        </button>
        {renewMessage && (
          <p className="text-sm text-slate-600 mt-3 bg-slate-50 rounded-lg p-3">{renewMessage}</p>
        )}
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
