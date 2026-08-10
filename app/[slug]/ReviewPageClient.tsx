'use client'

import { useState } from 'react'
import { StarRating } from '@/components/StarRating'
import { getRandomTemplates } from '@/lib/templates'
import type { BusinessPage, ReviewTemplate } from '@/types'

export default function ReviewPageClient({
  business,
  templates,
}: {
  business: BusinessPage
  templates: ReviewTemplate[]
}) {
  const [stars, setStars] = useState(0)
  const [reviews, setReviews] = useState<string[]>([])
  const [selected, setSelected] = useState(-1)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [feedbackText, setFeedbackText] = useState('')
  const [copied, setCopied] = useState(false)
  const [showCopyToast, setShowCopyToast] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [reviewSource, setReviewSource] = useState<'ai' | 'template_fallback' | null>(null)

  // Hidden diagnostic tag - add ?debug=1 to the review URL to see whether
  // reviews came from the real AI call or the backup templates, without
  // showing this to every customer. e.g. reviewboost.in/your-slug?debug=1
  // Read directly from the browser rather than useSearchParams so this
  // component doesn't need a Suspense boundary just for a debug flag.
  const [debugMode] = useState(
    () =>
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('debug') === '1'
  )

  async function handleStarClick(n: number) {
    setStars(n)
    setSelected(-1)
    setShowFeedback(false)
    setCopied(false)

    if (n >= 4) {
      setReviews([])
      setReviewSource(null)
      setLoadingReviews(true)

      // Show instant static suggestions immediately so the customer isn't staring
      // at a blank screen, then replace with AI drafts as soon as they're ready.
      setReviews(getRandomTemplates(templates, n, business))

      try {
        const res = await fetch('/api/generate-review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ business_id: business.id, stars: n }),
        })
        const data = await res.json()
        if (Array.isArray(data.reviews) && data.reviews.length > 0) {
          setReviews(data.reviews)
        }
        if (data.source === 'ai' || data.source === 'template_fallback') {
          setReviewSource(data.source)
        }
      } catch {
        // Network error - the static suggestions set above stay on screen.
        setReviewSource('template_fallback')
      } finally {
        setLoadingReviews(false)
      }
    } else {
      setReviews([])
      setShowFeedback(true)
    }
  }

  async function handleSubmit() {
    if (selected < 0 || submitting) return
    setSubmitting(true)

    // Fire-and-forget: analytics shouldn't block the customer's review flow
    // even if this fails.
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_id: business.id,
        stars_given: stars,
        template_index: selected,
        was_submitted: true,
      }),
    }).catch(() => {})

    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(reviews[selected])
      setCopied(true)
      // Brief confirmation so it's clear something happened before the new
      // tab opens - otherwise the copy is invisible and people aren't sure
      // whether they need to type the review themselves.
      setShowCopyToast(true)
      setTimeout(() => setShowCopyToast(false), 3000)
    } catch {
      setCopied(false)
    }

    // Open Google Review
    const url = `https://search.google.com/local/writereview?placeid=${business.google_place_id}`
    window.open(url, '_blank')

    setSubmitted(true)
  }

  async function handleFeedbackSubmit() {
    if (!feedbackText.trim() || submitting) return
    setSubmitting(true)
    setSubmitError('')

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: business.id,
          stars_given: stars,
          feedback_text: feedbackText,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Something went wrong. Please try again.')
      }

      setSubmitted(true)
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      )
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col items-center justify-center px-4 py-8">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Thank You!</h1>
        <p className="text-slate-600 text-center max-w-sm">
          Your feedback helps {business.business_name} improve. We appreciate your time!
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col items-center px-4 py-8">
      {/* Business Header */}
      <div className="text-center mb-8 max-w-md">
        {business?.logo_url ? (
          <img
            src={business.logo_url}
            alt={business.business_name}
            className="w-20 h-20 mx-auto mb-4 rounded-lg object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        ) : (
          <div className="w-20 h-20 mx-auto mb-4 rounded-lg bg-slate-200 animate-pulse" />
        )}
        <h1 className="text-2xl font-bold text-slate-900">{business.business_name}</h1>
        <p className="text-slate-500 text-sm mt-1">{business.location}</p>
      </div>

      {/* Star Rating */}
      <p className="text-slate-600 mb-6 font-medium">How was your experience?</p>
      <div className="mb-8">
        <StarRating value={stars} onSelect={handleStarClick} disabled={submitting} />
      </div>

      {/* Review Cards or Feedback Form */}
      {reviews.length > 0 && (
        <div className="w-full max-w-md space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 font-medium">
              {loadingReviews ? 'Personalizing your review...' : 'Tap a review to select it:'}
            </p>
            {debugMode && reviewSource && (
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  reviewSource === 'ai'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
                title={
                  reviewSource === 'ai'
                    ? 'These came from the real AI call'
                    : 'AI call failed or is not configured - showing backup templates'
                }
              >
                {reviewSource === 'ai' ? 'AI ✓' : 'Backup ⚠'}
              </span>
            )}
          </div>
          {reviews.map((review, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`w-full text-left p-4 rounded-xl border-2 text-sm leading-relaxed transition-all ${
                selected === i
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                  : 'border-slate-200 bg-white text-slate-800 hover:border-indigo-200'
              }`}
              disabled={submitting}
            >
              {review}
            </button>
          ))}
        </div>
      )}

      {showFeedback && (
        <div className="w-full max-w-md space-y-3 mb-6">
          <p className="text-sm text-slate-700 font-medium">Please tell us what we can improve:</p>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Your feedback..."
            className="w-full p-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={4}
            disabled={submitting}
          />
        </div>
      )}

      {/* Manual Copy Fallback (if clipboard failed) */}
      {!copied && selected >= 0 && submitted && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 w-full max-w-md text-sm">
          <p className="font-medium text-amber-800 mb-2">Long-press the text below and tap Copy:</p>
          <p className="bg-white p-3 rounded-lg text-slate-700 select-all cursor-text font-mono text-xs leading-relaxed">
            {reviews[selected]}
          </p>
        </div>
      )}

      {/* Submit Button */}
      {selected >= 0 && !showFeedback && (
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full max-w-md py-4 rounded-xl font-bold text-lg hover:opacity-90 active:scale-95 transition-all shadow-lg disabled:opacity-50"
          style={{ backgroundColor: `var(--brand)`, color: 'white' }}
        >
          {submitting ? 'Copying...' : 'Copy Review & Post on Google'}
        </button>
      )}

      {showFeedback && feedbackText.trim() && (
        <button
          onClick={handleFeedbackSubmit}
          disabled={submitting}
          className="w-full max-w-md py-4 rounded-xl font-bold text-lg text-white hover:opacity-90 active:scale-95 transition-all shadow-lg disabled:opacity-50 bg-slate-600"
        >
          {submitting ? 'Sending...' : 'Send Feedback'}
        </button>
      )}

      {submitError && (
        <p className="w-full max-w-md text-center text-red-600 text-sm mt-3 bg-red-50 rounded-lg p-3">
          {submitError}
        </p>
      )}

      {/* Copy confirmation toast */}
      {showCopyToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm font-medium px-5 py-3 rounded-full shadow-lg flex items-center gap-2 z-50">
          <span>✓</span>
          <span>Review copied — paste it in the Google box</span>
        </div>
      )}
    </div>
  )
}
