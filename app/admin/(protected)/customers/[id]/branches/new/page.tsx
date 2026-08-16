'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { generateSlug } from '@/lib/slug'
import { BUSINESS_CATEGORIES } from '@/lib/business-categories'

export default function AddBranchPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    business_name: '',
    google_place_id: '',
    city: '',
    location: '',
    area: '',
    cuisine_type: '',
    business_category: '',
    business_description: '',
    brand_color: '4F46E5',
  })

  function set(k: string, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/customers/${id}/branches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (res.ok && data.id) {
        router.push(`/admin/customers/${id}/branches/${data.id}/qr`)
        return
      }

      setError(data.error || 'Failed to add branch. Please check the details and try again.')
    } catch {
      setError('Network error - please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Add New Branch</h1>

      {form.business_name && (
        <div className="bg-indigo-50 rounded-lg p-3 mb-6 text-sm">
          <span className="text-slate-500">Review URL: </span>
          <span className="text-indigo-700 font-mono font-medium">
            {(process.env.NEXT_PUBLIC_BASE_URL || '').replace(/^https?:\/\//, '')}/{generateSlug(form.business_name)}
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
          <label className="block text-sm font-medium text-slate-700 mb-1">Branch / Outlet Name *</label>
          <input
            type="text"
            value={form.business_name}
            onChange={(e) => set('business_name', e.target.value)}
            placeholder="e.g. Taj Hotel - Bandra Branch"
            className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
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
          <label className="block text-sm font-medium text-slate-700 mb-1">Business Category *</label>
          <select
            value={form.business_category}
            onChange={(e) => {
              const category = BUSINESS_CATEGORIES.find((c) => c.value === e.target.value)
              set('business_category', e.target.value)
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
          <input
            type="text"
            value={form.business_description}
            onChange={(e) => set('business_description', e.target.value)}
            placeholder="e.g. sell and service industrial air compressors (follows the word 'They ...')"
            maxLength={150}
            className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Branch & Generate QR'}
        </button>
      </form>
    </div>
  )
}
