'use client'

interface QRDisplayProps {
  posterUrl: string
  slug: string
}

export function QRDisplay({ posterUrl, slug }: QRDisplayProps) {
  // Use the actual live base URL rather than a hardcoded "reviewboost.in" -
  // that domain isn't owned/live yet, so a hardcoded link there would just
  // be dead. NEXT_PUBLIC_BASE_URL is baked in at build time and points to
  // wherever the site is actually deployed.
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || '').replace(/^https?:\/\//, '')
  const fullUrl = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/${slug}`

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
      <a
        href={fullUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-sm text-indigo-600 hover:text-indigo-700 hover:underline"
      >
        {baseUrl}/{slug}
      </a>
    </div>
  )
}
