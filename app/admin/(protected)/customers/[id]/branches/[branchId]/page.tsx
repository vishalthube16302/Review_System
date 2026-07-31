'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import type { BusinessPage } from '@/types'
import { BUSINESS_CATEGORIES } from '@/lib/business-categories'

export default function EditBranchPage({
  params,
}: {
  params: Promise<{ id: string; branchId: string }>
}) {
  const { id, branchId } = use(params)
  const router = useRouter()
  const [branch, setBranch] = useState<BusinessPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<BusinessPage>>({})
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    fetch(`/api/branches/${branchId}`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}))
          throw new Error(body.error || 'Failed to load branch.')
        }
        return r.json()
      })
      .then((b) => {
        setBranch(b)
        setForm(b)
        setLoading(false)
      })
      .catch((err) => {
        setLoadError(err.message || 'Network error - please refresh and try again.')
        setLoading(false)
      })
  }, [branchId])

  function set(k: keyof BusinessPage, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError('')

    try {
      const res = await fetch(`/api/branches/${branchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to save changes.')
      }

      router.push(`/admin/customers/${id}`)
      router.refresh()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save changes.')
      setSaving(false)
    }
  }

  if (loadError) {
    return (
      <div className="max-w-md mx-auto mt-10 bg-red-50 border border-red-100 text-red-600 text-sm p-4 rounded-lg text-center">
        {loadError}
      </div>
    )
  }

  if (loading || !branch) {
    return <div className="p-6 text-slate-500">Loading...</div>
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Branch</h1>

      <form onSubmit={handleUpdate} className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Review URL (Permanent — cannot change)
          </label>
          <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-4 py-3">
            <span className="text-slate-400 text-sm">reviewboost.in/</span>
            <span className="font-mono text-indigo-700 font-medium text-sm">{branch.slug}</span>
            <span className="ml-auto text-xs text-slate-400">🔒 Linked to QR code</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Branch Name</label>
          <input
            type="text"
            value={form.business_name || ''}
            onChange={(e) => set('business_name', e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Google Place ID</label>
          <input
            type="text"
            value={form.google_place_id || ''}
            onChange={(e) => set('google_place_id', e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Business Category</label>
          <select
            value={form.business_category || ''}
            onChange={(e) => {
              const category = BUSINESS_CATEGORIES.find((c) => c.value === e.target.value)
              set('business_category', e.target.value)
              if (category) set('cuisine_type', category.label.split(' / ')[0].split(' (')[0])
            }}
            className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">Not set</option>
            {BUSINESS_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-400 mt-1">
            Used to help the AI write reviews that actually fit this business.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            What do they do? (short description)
          </label>
          <input
            type="text"
            value={form.business_description || ''}
            onChange={(e) => set('business_description', e.target.value)}
            placeholder="e.g. sell and service industrial air compressors (follows the word 'They ...')"
            maxLength={150}
            className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
            <input
              type="text"
              value={form.location || ''}
              onChange={(e) => set('location', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
            <input
              type="text"
              value={form.city || ''}
              onChange={(e) => set('city', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Brand Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={`#${form.brand_color || '4F46E5'}`}
              onChange={(e) => set('brand_color', e.target.value.replace('#', ''))}
              className="w-12 h-10 rounded cursor-pointer border border-slate-200"
            />
            <span className="font-mono text-sm">#{form.brand_color}</span>
            <div
              className="px-4 py-2 rounded-lg text-white text-sm font-medium"
              style={{ backgroundColor: `#${form.brand_color || '4F46E5'}` }}
            >
              Preview
            </div>
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active || false}
              onChange={(e) => set('is_active', String(e.target.checked))}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium text-slate-700">Active (QR code works)</span>
          </label>
        </div>

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
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
