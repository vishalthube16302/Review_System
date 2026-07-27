'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

interface Branding {
  found: boolean
  business_name?: string
  logo_url?: string | null
  brand_color?: string
}

export default function CustomerLoginPage() {
  const [step, setStep] = useState<'email' | 'password'>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [branding, setBranding] = useState<Branding | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/customer-lookup?email=${encodeURIComponent(email)}`)
      const data: Branding = await res.json()
      setBranding(data)
    } catch {
      setBranding({ found: false })
    }

    setStep('password')
    setLoading(false)
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Incorrect email or password.')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  const accentColor = branding?.found ? `#${branding.brand_color}` : '#4F46E5'

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-xl border border-slate-100">
        {step === 'email' || !branding?.found ? (
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-xl bg-indigo-50 flex items-center justify-center mx-auto mb-3 text-2xl">
              🏪
            </div>
            <h1 className="text-xl font-bold text-slate-900">Restaurant Owner Login</h1>
            <p className="text-slate-500 text-sm mt-1">Sign in to manage your reviews & feedback</p>
          </div>
        ) : (
          <div className="text-center mb-6">
            {branding.logo_url ? (
              <img
                src={branding.logo_url}
                alt={branding.business_name}
                className="w-16 h-16 rounded-xl object-cover mx-auto mb-3 border border-slate-100"
              />
            ) : (
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-3 text-white text-xl font-bold"
                style={{ backgroundColor: accentColor }}
              >
                {branding.business_name?.charAt(0) ?? '🏪'}
              </div>
            )}
            <h1 className="text-xl font-bold text-slate-900">Welcome back,</h1>
            <p className="text-lg font-semibold" style={{ color: accentColor }}>
              {branding.business_name}
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>
        )}

        {step === 'email' ? (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
              autoFocus
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Checking...' : 'Continue'}
            </button>
          </form>
        ) : (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
              autoFocus
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full text-white py-3 rounded-lg font-semibold text-sm disabled:opacity-50"
              style={{ backgroundColor: accentColor }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('email')
                setBranding(null)
                setPassword('')
                setError('')
              }}
              className="w-full text-slate-500 text-sm hover:text-slate-700"
            >
              ← Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
