'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { generateQRCode } from '@/lib/qr'
import { generateQRPoster } from '@/lib/qr-poster'
import { QRDisplay } from '@/components/QRDisplay'
import type { BusinessPage } from '@/types'

export default function RestaurantQRPage({
  params,
}: {
  params: Promise<{ branchId: string }>
}) {
  const { branchId } = use(params)
  const [posterUrl, setPosterUrl] = useState('')
  const [business, setBusiness] = useState<BusinessPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // /api/branches/[branchId] already scopes restaurant_owners to their own
    // branches - a restaurant owner requesting someone else's branchId gets
    // a 403 here, same as the admin version of this page.
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
        const poster = await generateQRPoster({
          qrDataUrl: qr,
          businessName: b.business_name,
          brandColor: b.brand_color,
        })
        setPosterUrl(poster)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message || 'Network error - please refresh and try again.')
        setLoading(false)
      })
  }, [branchId])

  function downloadPNG() {
    if (!posterUrl) return
    const link = document.createElement('a')
    link.href = posterUrl
    link.download = `${business?.slug}-review-qr.png`
    link.click()
  }

  function printQR() {
    if (!posterUrl) return
    const win = window.open('', '_blank')
    win?.document.write(`
      <html><body style='text-align:center;padding:20px'>
      <img src='${posterUrl}' width='400' />
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
    return <div className="max-w-sm mx-auto text-center py-10 text-slate-500">Loading QR code...</div>
  }

  return (
    <div className="max-w-sm mx-auto text-center py-10">
      <h1 className="text-xl font-bold mb-2">{business?.business_name}</h1>
      <p className="text-slate-500 text-sm mb-6">{business?.location}</p>

      {posterUrl && <QRDisplay posterUrl={posterUrl} slug={business?.slug ?? ''} />}

      <div className="flex gap-3 mt-6">
        <button
          onClick={downloadPNG}
          className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-medium text-sm hover:bg-indigo-700"
        >
          Download PNG
        </button>
        <button
          onClick={printQR}
          className="flex-1 bg-slate-800 text-white py-3 rounded-xl font-medium text-sm hover:bg-slate-900"
        >
          Print QR
        </button>
      </div>

      <Link href="/dashboard" className="block mt-6 text-sm text-indigo-600 hover:text-indigo-700">
        ← Back to Dashboard
      </Link>
    </div>
  )
}
