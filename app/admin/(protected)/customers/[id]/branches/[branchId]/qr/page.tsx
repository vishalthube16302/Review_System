'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { generateQRCode, generateDirectGoogleQRCode } from '@/lib/qr'
import { generateQRPoster, generateDirectGooglePoster } from '@/lib/qr-poster'
import { QRDisplay } from '@/components/QRDisplay'
import type { BusinessPage } from '@/types'

type PosterKind = 'ai' | 'direct'

export default function QRPage({
  params,
}: {
  params: Promise<{ id: string; branchId: string }>
}) {
  const { id, branchId } = use(params)
  const [aiPosterUrl, setAiPosterUrl] = useState('')
  const [directPosterUrl, setDirectPosterUrl] = useState('')
  const [business, setBusiness] = useState<BusinessPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [active, setActive] = useState<PosterKind>('ai')

  useEffect(() => {
    fetch(`/api/branches/${branchId}`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}))
          throw new Error(body.error || 'Failed to load branch.')
        }
        return r.json()
      })
      .then(async (b: BusinessPage) => {
        setBusiness(b)

        const qr = await generateQRCode(b.slug)
        const aiPoster = await generateQRPoster({
          qrDataUrl: qr,
          businessName: b.business_name,
          brandColor: b.brand_color,
          logoUrl: b.logo_url,
        })
        setAiPosterUrl(aiPoster)

        if (b.google_place_id) {
          const directQr = await generateDirectGoogleQRCode(b.google_place_id)
          const directPoster = await generateDirectGooglePoster({
            qrDataUrl: directQr,
            businessName: b.business_name,
            logoUrl: b.logo_url,
          })
          setDirectPosterUrl(directPoster)
        }

        setLoading(false)
      })
      .catch((err) => {
        setError(err.message || 'Network error - please refresh and try again.')
        setLoading(false)
      })
  }, [branchId])

  const activeUrl = active === 'ai' ? aiPosterUrl : directPosterUrl
  const activeLabel = active === 'ai' ? 'ai-powered' : 'direct-google'

  function downloadPNG() {
    if (!activeUrl) return
    const link = document.createElement('a')
    link.href = activeUrl
    link.download = `${business?.slug}-${activeLabel}-qr.png`
    link.click()
  }

  function printQR() {
    if (!activeUrl) return
    const win = window.open('', '_blank')
    win?.document.write(`
      <html><body style='text-align:center;padding:20px'>
      <img src='${activeUrl}' width='400' />
      </body></html>
    `)
    win?.print()
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-10 bg-red-50 border border-red-100 text-red-600 text-sm p-4 rounded-lg text-center">
        {error}
      </div>
    )
  }

  if (loading) {
    return <div className="max-w-sm mx-auto text-center py-10 text-slate-500">Loading QR codes...</div>
  }

  return (
    <div className="max-w-sm mx-auto text-center py-10 px-4">
      <h1 className="text-xl font-bold mb-2">{business?.business_name}</h1>
      <p className="text-slate-500 text-sm mb-6">{business?.location}</p>

      {/* Poster type toggle */}
      <div className="inline-flex bg-slate-100 rounded-full p-1 mb-6 text-sm font-medium">
        <button
          onClick={() => setActive('ai')}
          className={`px-4 py-2 rounded-full transition-colors ${
            active === 'ai' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
          }`}
        >
          AI-Powered
        </button>
        <button
          onClick={() => setActive('direct')}
          disabled={!directPosterUrl}
          className={`px-4 py-2 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            active === 'direct' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
          }`}
        >
          Direct to Google
        </button>
      </div>

      {!directPosterUrl && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-4">
          No Google Place ID set for this branch - the Direct to Google QR needs one. Add it on
          the branch edit page.
        </p>
      )}

      <p className="text-xs text-slate-400 mb-4">
        {active === 'ai'
          ? 'Customer scans, picks a star rating, AI drafts a review, they copy and post it.'
          : "Customer scans, goes straight to Google's review box. No AI, no in-between page."}
      </p>

      {activeUrl && <QRDisplay posterUrl={activeUrl} slug={business?.slug ?? ''} />}

      <div className="flex gap-3 mt-6">
        <button
          onClick={downloadPNG}
          disabled={!activeUrl}
          className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-medium text-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          Download PNG
        </button>
        <button
          onClick={printQR}
          disabled={!activeUrl}
          className="flex-1 bg-slate-800 text-white py-3 rounded-xl font-medium text-sm hover:bg-slate-900 disabled:opacity-50"
        >
          Print QR
        </button>
      </div>

      <Link
        href={`/admin/customers/${id}`}
        className="block mt-6 text-sm text-indigo-600 hover:text-indigo-700"
      >
        ← Back to {business?.business_name ?? 'customer'}
      </Link>
    </div>
  )
}
