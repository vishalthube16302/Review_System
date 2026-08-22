'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { DEFAULT_PROMPT_TEMPLATE } from '@/lib/review-prompt'
import { PROMPT_TEMPLATE_MAX_LENGTH } from '@/lib/constants'
import type { BusinessPage } from '@/types'

export default function RestaurantPromptPage({
  params,
}: {
  params: Promise<{ branchId: string }>
}) {
  const { branchId } = use(params)
  const [business, setBusiness] = useState<BusinessPage | null>(null)
  const [promptTemplate, setPromptTemplate] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    // /api/branches/[branchId] already scopes restaurant_owners to their own
    // branches - a restaurant owner requesting someone else's branchId gets
    // a 403 here, same as the QR page.
    fetch(`/api/branches/${branchId}`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}))
          throw new Error(body.error || 'Failed to load branch.')
        }
        return r.json()
      })
      .then((b: BusinessPage) => {
        setBusiness(b)
        setPromptTemplate(b.prompt_template || '')
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message || 'Network error - please refresh and try again.')
        setLoading(false)
      })
  }, [branchId])

  async function save() {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      // This endpoint restricts a restaurant_owner to only ever updating
      // prompt_template, no matter what else is in the body - so it's safe
      // to send just this one field.
      const res = await fetch(`/api/branches/${branchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt_template: promptTemplate }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to save changes.')
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="max-w-2xl mx-auto text-center py-10 text-slate-500">Loading...</div>
  }

  if (error && !business) {
    return (
      <div className="max-w-md mx-auto mt-10 bg-red-50 border border-red-100 text-red-600 text-sm p-4 rounded-lg text-center">
        {error}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-6">
      <h1 className="text-xl font-bold text-slate-900">{business?.business_name}</h1>
      <p className="text-slate-500 text-sm mb-6">AI Prompt Template</p>

      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-slate-700">
            This is the exact prompt sent to the AI for your reviews
          </label>
          <button
            type="button"
            onClick={() => setPromptTemplate(DEFAULT_PROMPT_TEMPLATE)}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Reset to default
          </button>
        </div>
        <textarea
          value={promptTemplate}
          onChange={(e) => setPromptTemplate(e.target.value)}
          placeholder="Leave blank to use the default AI prompt"
          maxLength={PROMPT_TEMPLATE_MAX_LENGTH}
          rows={14}
          className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
        />
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-slate-400">
            Leave blank to use the default AI prompt. Available variables:{' '}
            {'{{business_name}}'}, {'{{keywords}}'}, {'{{area}}'},{' '}
            {'{{rating}}'}, {'{{seed}}'}. Changes apply to every review generated from now on.
          </p>
          <span className="text-xs text-slate-300 shrink-0 ml-2">
            {promptTemplate.length}/{PROMPT_TEMPLATE_MAX_LENGTH}
          </span>
        </div>

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        {saved && <p className="text-sm text-green-600 mt-3">Saved.</p>}

        <button
          onClick={save}
          disabled={saving}
          className="mt-4 bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <Link href="/dashboard" className="block mt-6 text-sm text-indigo-600 hover:text-indigo-700">
        ← Back to Dashboard
      </Link>
    </div>
  )
}
