'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { generateSlug } from '@/lib/slug'
import { DurationPicker } from '@/components/DurationPicker'
import { BUSINESS_CATEGORIES } from '@/lib/business-categories'
import { BUSINESS_DESCRIPTION_MAX_LENGTH, looksLikeKeywordList } from '@/lib/constants'

const PLANS = [
  { id: 'basic', label: 'Basic', days: 90, price: '₹999' },
  { id: 'standard', label: 'Standard', days: 180, price: '₹1,799' },
  { id: 'premium', label: 'Premium', days: 365, price: '₹2,999' },
]

export default function AddCustomerPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [subscriptionDays, setSubscriptionDays] = useState(180)
  const [credentials, setCredentials] = useState<{ username: string; password: string } | null>(
    null
  )
  const [credentialsError, setCredentialsError] = useState('')
  const [copied, setCopied] = useState(false)
  const [createdIds, setCreatedIds] = useState<{ customerId: string; branchId: string } | null>(
    null
  )
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState('')
  const [logoError, setLogoError] = useState('')
  const [form, setForm] = useState({
    business_name: '',
    owner_name: '',
    phone: '',
    email: '',
    google_place_id: '',
    city: '',
    location: '',
    area: '',
    cuisine_type: '',
    business_category: '',
    business_description: '',
    brand_color: '4F46E5',
    plan: 'standard',
  })

  function set(k: string, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  function selectPlan(planId: string) {
    set('plan', planId)
    // Pre-fill a sensible default duration for the tier, but the admin can
    // still override it with the picker below - plan tier and subscription
    // length are independent, this is just a helpful starting point.
    const tier = PLANS.find((p) => p.id === planId)
    if (tier) setSubscriptionDays(tier.days)
  }

  const today = new Date()
  const expiryDate = new Date(today)
  expiryDate.setDate(expiryDate.getDate() + subscriptionDays)
  const dateFormat: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
  const todayLabel = today.toLocaleDateString('en-US', dateFormat)
  const expiryLabel = expiryDate.toLocaleDateString('en-US', dateFormat)

  function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setLogoError('')
    if (!file) {
      setLogoFile(null)
      setLogoPreview('')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError('Logo must be under 2MB.')
      return
    }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Upload the logo first (if one was picked) so we have its public URL
      // to attach to the customer record we're about to create.
      let logo_url = ''
      if (logoFile) {
        const logoForm = new FormData()
        logoForm.append('file', logoFile)
        const uploadRes = await fetch('/api/upload-logo', { method: 'POST', body: logoForm })
        const uploadData = await uploadRes.json()
        if (!uploadRes.ok) {
          setError(uploadData.error || 'Failed to upload logo. Please try again.')
          setLoading(false)
          return
        }
        logo_url = uploadData.logo_url
      }

      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, logo_url, subscription_days: subscriptionDays }),
      })

      const data = await res.json()

      if (res.ok && data.id) {
        setCreatedIds({ customerId: data.customer_id, branchId: data.id })
        if (data.credentials) {
          setCredentials(data.credentials)
        } else {
          setCredentialsError(data.credentialsError || '')
          // No credentials to show - go straight to the QR page.
          router.push(`/admin/customers/${data.customer_id}/branches/${data.id}/qr`)
        }
        return
      }

      setError(data.error || 'Failed to create customer. Please check the details and try again.')
    } catch {
      setError('Network error - please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  function copyCredentials() {
    if (!credentials) return
    navigator.clipboard.writeText(`Username: ${credentials.username}\nPassword: ${credentials.password}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function continueToQR() {
    if (createdIds) {
      router.push(`/admin/customers/${createdIds.customerId}/branches/${createdIds.branchId}/qr`)
    }
  }

  if (credentials) {
    return (
      <div className="max-w-md mx-auto mt-10">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
            ✓
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-1">Customer Created</h1>
          <p className="text-sm text-slate-500 mb-6">
            Share these login details with the customer. They can change the password after
            logging in.
          </p>

          <div className="bg-slate-50 rounded-xl p-4 text-left space-y-3 mb-4">
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wide">Username (email)</div>
              <div className="font-mono text-sm text-slate-900">{credentials.username}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wide">Password</div>
              <div className="font-mono text-sm text-slate-900">{credentials.password}</div>
            </div>
          </div>

          <button
            onClick={copyCredentials}
            className="w-full bg-slate-800 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-slate-900 mb-3"
          >
            {copied ? 'Copied ✓' : 'Copy Username & Password'}
          </button>
          <button
            onClick={continueToQR}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            Continue to QR Code →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Add New Customer</h1>
      {credentialsError && (
        <div className="bg-amber-50 text-amber-700 text-sm p-3 rounded-lg border border-amber-100 mb-4">
          {credentialsError}
        </div>
      )}

      {form.business_name && (
        <div className="bg-indigo-50 rounded-lg p-3 mb-6 text-sm">
          <span className="text-slate-500">Review URL: </span>
          <span className="text-indigo-700 font-mono font-medium">
            reviewboost.in/{generateSlug(form.business_name)}
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Business Name *</label>
          <input
            type="text"
            value={form.business_name}
            onChange={(e) => set('business_name', e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Owner Name *</label>
            <input
              type="text"
              value={form.owner_name}
              onChange={(e) => set('owner_name', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="owner@business.com"
            className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
          <p className="text-xs text-slate-400 mt-1">
            This becomes their login username for the Business Admin panel.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Google Place ID *</label>
          <input
            type="text"
            value={form.google_place_id}
            onChange={(e) => set('google_place_id', e.target.value)}
            placeholder="ChIJxxxxxxxxxxxxxxxx"
            className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">City *</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => set('city', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Area</label>
            <input
              type="text"
              value={form.area}
              onChange={(e) => set('area', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Location *</label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => set('location', e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Business Category *</label>
          <select
            value={form.business_category}
            onChange={(e) => {
              const category = BUSINESS_CATEGORIES.find((c) => c.value === e.target.value)
              set('business_category', e.target.value)
              // Keep cuisine_type in sync automatically so older fallback
              // review templates (which use {cuisine}) still read sensibly -
              // the admin never has to fill this in twice.
              if (category) set('cuisine_type', category.label.split(' / ')[0].split(' (')[0])
            }}
            className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            required
          >
            <option value="" disabled>
              Select the type of business...
            </option>
            {BUSINESS_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            What do they do? (short description, helps AI write better reviews)
          </label>
          <textarea
            value={form.business_description}
            onChange={(e) => set('business_description', e.target.value)}
            placeholder="e.g. repair laptops, sell new computers, and refill printer cartridges"
            maxLength={BUSINESS_DESCRIPTION_MAX_LENGTH}
            rows={2}
            className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-slate-400">
              Write it as one plain sentence, like you are telling a friend - not a list of
              keywords. It gets used as: <span className="italic">&quot;They {form.business_description || '...'}&quot;</span>
            </p>
            <span className="text-xs text-slate-300 shrink-0 ml-2">
              {form.business_description.length}/{BUSINESS_DESCRIPTION_MAX_LENGTH}
            </span>
          </div>
          {looksLikeKeywordList(form.business_description) && (
            <p className="text-xs text-amber-600 mt-1">
              This looks like a list of keywords rather than a sentence - AI reviews read better
              from a plain sentence, like the example above.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Business Logo</label>
          <div className="flex items-center gap-4">
            {logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element -- local object URL preview, not a remote asset
              <img
                src={logoPreview}
                alt="Logo preview"
                className="w-16 h-16 rounded-lg object-cover border border-slate-200"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-300 text-xs">
                No logo
              </div>
            )}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleLogoSelect}
              className="text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 file:text-sm file:font-medium hover:file:bg-indigo-100"
            />
          </div>
          {logoError && <p className="text-xs text-red-600 mt-1">{logoError}</p>}
          <p className="text-xs text-slate-400 mt-1">
            Optional. PNG, JPEG, WEBP, or SVG, under 2MB. Shown on the customer&apos;s public
            review page.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Brand Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={`#${form.brand_color}`}
              onChange={(e) => set('brand_color', e.target.value.replace('#', ''))}
              className="w-12 h-10 rounded cursor-pointer border border-slate-200"
            />
            <span className="font-mono text-sm">#{form.brand_color}</span>
            <div
              className="px-4 py-2 rounded-lg text-white text-sm font-medium"
              style={{ backgroundColor: `#${form.brand_color}` }}
            >
              Preview
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Plan *</label>
          <div className="grid grid-cols-3 gap-3">
            {PLANS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => selectPlan(p.id)}
                className={`p-3 rounded-lg border-2 text-center transition ${
                  form.plan === p.id
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-slate-200 bg-white hover:border-indigo-300'
                }`}
              >
                <div className="font-semibold text-slate-900">{p.label}</div>
                <div className="text-xs text-slate-600">{p.days} days</div>
                <div className="text-sm font-bold text-indigo-600">{p.price}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Subscription Duration *
          </label>
          <DurationPicker value={subscriptionDays} onChange={setSubscriptionDays} />
          <div className="mt-3 bg-slate-50 rounded-lg p-3 text-sm flex items-center justify-between">
            <div>
              <span className="text-slate-500">Starts:</span>{' '}
              <span className="font-medium text-slate-800">{todayLabel}</span>
            </div>
            <div className="text-slate-300">→</div>
            <div>
              <span className="text-slate-500">Expires:</span>{' '}
              <span className="font-semibold text-indigo-700">{expiryLabel}</span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create & Generate QR'}
        </button>
      </form>
    </div>
  )
}
