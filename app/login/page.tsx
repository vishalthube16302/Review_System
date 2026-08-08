import Link from 'next/link'

export default function LoginChooserPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- static public asset */}
        <img src="/logo-icon.png" alt="Review Booster" className="w-14 h-14 mx-auto mb-3" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Review Booster</h1>
        <p className="text-slate-500 text-sm mb-8">Who's signing in?</p>

        <div className="space-y-3">
          <Link
            href="/customer/login"
            className="block w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold text-sm hover:bg-indigo-700"
          >
            🏪 I'm a Business Owner
          </Link>
          <Link
            href="/admin/login"
            className="block w-full bg-slate-900 text-white py-3 rounded-lg font-semibold text-sm hover:bg-slate-800"
          >
            🔑 I'm the Platform Admin
          </Link>
        </div>
      </div>
    </div>
  )
}
