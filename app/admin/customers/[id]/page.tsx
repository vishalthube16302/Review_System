'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'

export default function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [business, setBusiness] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({})

  useEffect(() => {
    fetch(`/api/customers/${id}`)
      .then((r) => r.json())
      .then((b) => {
        setBusiness(b)
        setForm(b)
        setLoading(false)
      })
  }, [id])

  function set(k: string, v: string) {
    setForm((prev: any) => ({ ...prev, [k]: v }))
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

  if (loading || !business) {
    return <div className="p-6 text-slate-500">Loading...</div>
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Customer</h1>

      <form onSubmit={handleUpdate} className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
        {/* Slug is permanently locked */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Review URL (Permanent — cannot change)
          </label>
          <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-4 py-3">
            <span className="text-slate-400 text-sm">reviewboost.in/</span>
            <span className="font-mono text-indigo-700 font-medium text-sm">{business.slug}</span>
            <span className="ml-auto text-xs text-slate-400">🔒 Linked to QR code</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Business Name</label>
          <input
            type="text"
            value={form.business_name || ''}
            onChange={(e) => set('business_name', e.target.value)}
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
