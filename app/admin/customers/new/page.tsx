'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { generateSlug } from '@/lib/slug'

const PLANS = [
  { id: 'basic', label: 'Basic', days: 90, price: '₹999' },
  { id: 'standard', label: 'Standard', days: 180, price: '₹1,799' },
  { id: 'premium', label: 'Premium', days: 365, price: '₹2,999' },
]

export default function AddCustomerPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
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
    brand_color: '4F46E5',
    plan: 'standard',
  })

  function set(k: string, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()

    if (data.id) {
      router.push(`/admin/customers/${data.customer_id}/qr`)
    }

    setLoading(false)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Add New Customer</h1>

      {form.business_name && (
        <div className="bg-indigo-50 rounded-lg p-3 mb-6 text-sm">
          <span className="text-slate-500">Review URL: </span>
          <span className="text-indigo-700 font-mono font-medium">
            reviewboost.in/{generateSlug(form.business_name)}
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
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
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
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
          <label className="block text-sm font-medium text-slate-700 mb-1">Cuisine Type *</label>
          <input
            type="text"
            value={form.cuisine_type}
            onChange={(e) => set('cuisine_type', e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
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
                onClick={() => set('plan', p.id)}
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
