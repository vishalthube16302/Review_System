'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { generateQRCode } from '@/lib/qr'
import { QRDisplay } from '@/components/QRDisplay'
import type { BusinessPage } from '@/types'

export default function QRPage({
  params,
}: {
  params: Promise<{ id: string; branchId: string }>
}) {
  const { id, branchId } = use(params)
  const [qrData, setQrData] = useState('')
  const [business, setBusiness] = useState<BusinessPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
        setQrData(qr)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message || 'Network error - please refresh and try again.')
        setLoading(false)
      })
  }, [branchId])

  function downloadPNG() {
    if (!qrData) return
    const link = document.createElement('a')
    link.href = qrData
    link.download = `${business?.slug}-qr.png`
    link.click()
  }

  function printQR() {
    if (!qrData) return
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin
    const win = window.open('', '_blank')
    win?.document.write(`
      <html><body style='text-align:center;font-family:sans-serif;padding:40px'>
      <h2>${business?.business_name}</h2>
      <p>${business?.location}</p>
      <img src='${qrData}' width='300' />
      <p style='font-size:14px;color:#666'>Scan to leave a Google Review</p>
      <p style='font-size:11px;color:#999'>${baseUrl}/${business?.slug}</p>
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

      {qrData && <QRDisplay dataUrl={qrData} slug={business?.slug ?? ''} />}

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

      <Link
        href={`/admin/customers/${id}`}
        className="block mt-6 text-sm text-indigo-600 hover:text-indigo-700"
      >
        ← Back to {business?.business_name ?? 'customer'}
      </Link>
    </div>
  )
}
