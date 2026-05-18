'use client'

import Image from 'next/image'

interface QRDisplayProps {
  dataUrl: string
  slug: string
}

export function QRDisplay({ dataUrl, slug }: QRDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      {dataUrl && (
        <img src={dataUrl} alt="QR Code" className="w-64 h-64 border-4 border-white rounded-2xl shadow-lg" />
      )}
      <p className="font-mono text-sm text-indigo-600">reviewboost.in/{slug}</p>
    </div>
  )
}
