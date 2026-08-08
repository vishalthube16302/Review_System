import Link from 'next/link'

export default function ExpiredPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">⏰</div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Link Unavailable</h1>
        <p className="text-slate-500 text-sm leading-relaxed mb-6">
          This review page is currently unavailable. Please contact the business directly, or
          check back later.
        </p>
        <div className="border-t border-slate-200 pt-6">
          <p className="text-slate-400 text-xs mb-3">Run a business? Get a page like this one.</p>
          <Link
            href="/"
            className="inline-block bg-indigo-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-indigo-700"
          >
            Learn about Review Booster
          </Link>
        </div>
      </div>
    </div>
  )
}
