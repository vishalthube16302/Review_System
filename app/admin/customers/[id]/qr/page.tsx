'use client'

import { useEffect, useState } from 'react'
import { generateQRCode } from '@/lib/qr'
import { QRDisplay } from '@/components/QRDisplay'

export default function QRPage({ params }: { params: { id: string } }) {
  const [qrData, setQrData] = useState('')
  const [business, setBusiness] = useState<any>(null)

  useEffect(() => {
    fetch(`/api/customers/${params.id}`)
      .then((r) => r.json())
      .then(async (b) => {
        setBusiness(b)
        const qr = await generateQRCode(b.slug)
        setQrData(qr)
      })
  }, [params.id])

  function downloadPNG() {
    if (!qrData) return
    const link = document.createElement('a')
    link.href = qrData
    link.download = `${business?.slug}-qr.png`
    link.click()
  }

  function printQR() {
    if (!qrData) return
    const win = window.open('', '_blank')
    win?.document.write(`
      <html><body style='text-align:center;font-family:sans-serif;padding:40px'>
      <h2>${business?.business_name}</h2>
      <p>${business?.location}</p>
      <img src='${qrData}' width='300' />
      <p style='font-size:14px;color:#666'>
        Scan to leave a Google Review
      </p>
      <p style='font-size:11px;color:#999'>reviewboost.in/${business?.slug}</p>
      </body></html>
    `)
    win?.print()
  }

  return (
    <div className="max-w-sm mx-auto text-center py-10">
      <h1 className="text-xl font-bold mb-2">{business?.business_name}</h1>
      <p className="text-slate-500 text-sm mb-6">{business?.location}</p>

      {qrData && <QRDisplay dataUrl={qrData} slug={business?.slug} />}

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
    </div>
  )
}
