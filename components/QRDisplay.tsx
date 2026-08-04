'use client'

interface QRDisplayProps {
  posterUrl: string
  slug: string
}

export function QRDisplay({ posterUrl, slug }: QRDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      {posterUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- dynamically generated canvas data URL
        <img
          src={posterUrl}
          alt="Google Review QR poster"
          className="w-72 rounded-2xl shadow-lg border border-slate-200"
        />
      )}
      <p className="font-mono text-sm text-indigo-600">reviewboost.in/{slug}</p>
    </div>
  )
}
