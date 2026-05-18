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
  const [feedbackText, setFeedbackText] = useState('')
  const [copied, setCopied] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)

  function handleStarClick(n: number) {
    setStars(n)
    setSelected(-1)
    setShowFeedback(false)
    setCopied(false)

    if (n >= 4) {
      const revs = getRandomTemplates(templates, n, business)
      setReviews(revs)
    } else {
      setReviews([])
      setShowFeedback(true)
    }
  }

  async function handleSubmit() {
    if (selected < 0 || submitting) return
    setSubmitting(true)

    // Save analytics
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_id: business.id,
        stars_given: stars,
        template_index: selected,
        was_submitted: true,
      }),
    })

    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(reviews[selected])
      setCopied(true)
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

    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_id: business.id,
        stars_given: stars,
        feedback_text: feedbackText,
      }),
    })

    setSubmitted(true)
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
          <p className="text-sm text-slate-500 font-medium">Select your review:</p>
          {reviews.map((review, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`w-full text-left p-4 rounded-xl border-2 text-sm leading-relaxed transition-all ${
                selected === i
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                  : 'border-slate-200 bg-white hover:border-indigo-200'
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
          {submitting ? 'Submitting...' : 'Post to Google ✓'}
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
    </div>
  )
}
