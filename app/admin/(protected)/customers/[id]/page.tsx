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
  const [receiptUrl, setReceiptUrl] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [amountPaid, setAmountPaid] = useState('')
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [resettingPassword, setResettingPassword] = useState(false)
  const [resetPassword, setResetPassword] = useState('')
  const [resetCopied, setResetCopied] = useState(false)
  const [resetError, setResetError] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function handleDelete() {
    setDeleting(true)
    setDeleteError('')
    try {
      const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        router.push('/admin/customers')
        return
      }
      setDeleteError(data.error || 'Failed to delete customer.')
    } catch {
      setDeleteError('Network error - please try again.')
    } finally {
      setDeleting(false)
    }
  }

  async function handleResetPassword() {
    setResettingPassword(true)
    setResetError('')
    try {
      const res = await fetch(`/api/customers/${id}/reset-password`, { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.password) {
        setResetPassword(data.password)
      } else {
        setResetError(data.error || 'Failed to reset password.')
      }
    } catch {
      setResetError('Network error - please try again.')
    } finally {
      setResettingPassword(false)
    }
  }

  useEffect(() => {
    fetch(`/api/customers/${id}`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}))
          throw new Error(body.error || 'Failed to load customer.')
        }
        return r.json()
      })
      .then((c) => {
        setCustomer(c)
        setForm(c)
        setLoading(false)
      })
      .catch((err) => {
        setLoadError(err.message || 'Network error - please refresh and try again.')
        setLoading(false)
      })
  }, [id])

  function set(k: keyof Customer, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError('')

    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to save changes.')
      }

      // This page fetches its own data client-side (not via server props),
      // so router.refresh() alone wouldn't actually pull the saved changes
      // back in - refetch explicitly so the form and status badge reflect
      // what's now in the database.
      const refreshed = await fetch(`/api/customers/${id}`).then((r) => r.json())
      setCustomer(refreshed)
      setForm(refreshed)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRenew() {
    setRenewing(true)
    setRenewMessage('')
    setReceiptUrl('')

    try {
      const res = await fetch(`/api/customers/${id}/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription_days: renewDays,
          payment_method: paymentMethod,
          amount_paid: amountPaid ? Number(amountPaid) : null,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setRenewMessage(
          `Renewed - now valid until ${new Date(data.paid_until).toLocaleDateString()}. QR codes unchanged.`
        )
        if (data.receipt_url) setReceiptUrl(data.receipt_url)
        const refreshed = await fetch(`/api/customers/${id}`).then((r) => r.json())
        setCustomer(refreshed)
        setForm(refreshed)
      } else {
        setRenewMessage(data.error || 'Renewal failed.')
      }
    } catch {
      setRenewMessage('Network error - please check your connection and try again.')
    } finally {
      setRenewing(false)
    }
  }

  if (loadError) {
    return (
      <div className="max-w-md mx-auto mt-10 bg-red-50 border border-red-100 text-red-600 text-sm p-4 rounded-lg text-center">
        {loadError}
      </div>
    )
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

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Subscription Valid Until
            </label>
            <input
              type="date"
              value={form.paid_until ? form.paid_until.slice(0, 10) : ''}
              onChange={(e) => set('paid_until', new Date(e.target.value).toISOString())}
              className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-slate-400 mt-1">
              Directly set an exact date - useful for manual/offline payments. Also updates this
              customer's branches. For adding a fixed number of days instead, use Renew below.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.is_active}
                onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-slate-700">Account Active</span>
            </label>
            <StatusBadge isActive={!!form.is_active} expiresAt={form.paid_until || customer.paid_until} />
          </div>

          {!form.is_active && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              Unchecked - saving this will immediately take down this customer&apos;s review
              page(s). Visitors will see the &quot;unavailable&quot; page instead.
            </p>
          )}

          {saveError && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">
              {saveError}
            </div>
          )}

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
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Login &amp; Password</h2>
        <p className="text-sm text-slate-500 mb-4">
          If the customer forgot their password or lost the credentials you shared at signup,
          generate a new one here. They will be required to set their own password the next
          time they log in.
        </p>
        {resetPassword ? (
          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wide">New Password</div>
              <div className="font-mono text-sm text-slate-900">{resetPassword}</div>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(resetPassword)
                setResetCopied(true)
                setTimeout(() => setResetCopied(false), 2000)
              }}
              className="w-full bg-slate-800 text-white py-2 rounded-lg text-sm font-medium hover:bg-slate-900"
            >
              {resetCopied ? 'Copied ✓' : 'Copy Password'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={resettingPassword}
            onClick={handleResetPassword}
            className="bg-white border border-slate-300 text-slate-700 py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            {resettingPassword ? 'Generating...' : 'Reset Password'}
          </button>
        )}
        {resetError && <p className="text-sm text-red-600 mt-2">{resetError}</p>}
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

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Amount Paid (₹, optional)
            </label>
            <input
              type="number"
              min={0}
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              placeholder="e.g. 1799"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
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
        {receiptUrl && (
          <a
            href={receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center mt-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            View / Print Receipt →
          </a>
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

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-red-100">
        <h2 className="text-lg font-semibold text-red-700 mb-1">Danger Zone</h2>
        <p className="text-sm text-slate-500 mb-4">
          Permanently deletes this customer, all their branches, feedback, scan history, and
          their login account. This cannot be undone.
        </p>
        {!confirmingDelete ? (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="bg-white border border-red-300 text-red-600 py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-red-50"
          >
            Delete Customer
          </button>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-800 mb-3">
              Type the business name (<strong>{customer.business_name}</strong>) to confirm
              deletion.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full border border-red-300 rounded-lg px-4 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-red-400"
              placeholder={customer.business_name}
            />
            {deleteError && <p className="text-sm text-red-700 mb-3">{deleteError}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                disabled={deleteConfirmText !== customer.business_name || deleting}
                onClick={handleDelete}
                className="bg-red-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting...' : 'Permanently Delete'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmingDelete(false)
                  setDeleteConfirmText('')
                  setDeleteError('')
                }}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
