'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { StarRating } from '@/components/StarRating'
import { getNegativeChips, getPositiveChips } from '@/lib/review-chips'
import type { PublicBusinessInfo } from '@/types'

/**
 * One-screen review flow, built for the fewest taps:
 *   1. tap stars        -> a review starts writing immediately
 *   2. tap keywords     -> the review rewrites itself around them (optional)
 *   3. Copy & post      -> copied + Google opens
 * No extra questions, no separate steps. The review text is directly editable.
 */

const INK = 'text-[#16181D]'
const MUTED = 'text-[#6A6F7B]'
const REGENERATE_DELAY_MS = 900

type Screen = 'review' | 'posted' | 'private' | 'private_sent'

export default function ReviewPageClient({ business }: { business: PublicBusinessInfo }) {
  const [stars, setStars] = useState(0)
  const [chips, setChips] = useState<string[]>([])
  const [drafts, setDrafts] = useState<string[]>([])
  const [index, setIndex] = useState(0)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [screen, setScreen] = useState<Screen>('review')
  const [copied, setCopied] = useState(false)
  const [privateText, setPrivateText] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')

  const [debugMode] = useState(
    () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1'
  )
  const [debugInfo, setDebugInfo] = useState('')

  const abortRef = useRef<AbortController | null>(null)
  const reviewRef = useRef<HTMLDivElement>(null)

  const chipOptions = useMemo(() => {
    if (!stars) return []
    if (stars >= 4) return getPositiveChips(business.business_category, business.keywords)
    if (stars <= 2) return getNegativeChips(business.business_category)
    // 3 stars: a few of each, in one list
    return [
      ...getPositiveChips(business.business_category, business.keywords).slice(0, 4),
      ...getNegativeChips(business.business_category).slice(0, 4),
    ]
  }, [stars, business.business_category, business.keywords])

  const googleUrl = `https://search.google.com/local/writereview?placeid=${business.google_place_id}`

  // Write (or rewrite) the review whenever the rating or keywords change.
  useEffect(() => {
    if (!stars) return
    const timer = setTimeout(() => generate(stars, chips), chips.length ? REGENERATE_DELAY_MS : 0)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stars, chips])

  async function generate(rating: number, selected: string[]) {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setFailed(false)

    const negatives = new Set(getNegativeChips(business.business_category))
    const highlights = selected.filter((c) => !negatives.has(c))
    const improvements = selected.filter((c) => negatives.has(c))

    try {
      const res = await fetch('/api/generate-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: business.id, stars: rating, highlights, improvements, debug: debugMode }),
        signal: controller.signal,
      })
      const data = await res.json().catch(() => ({}))
      if (debugMode) {
        setDebugInfo(JSON.stringify({ status: res.status, source: data.source, model: data.model, errors: data.errors }, null, 1))
      }
      if (!res.ok || !Array.isArray(data.reviews) || !data.reviews.length) throw new Error('no drafts')
      setDrafts(data.reviews)
      setIndex(0)
      setText(data.reviews[0])
      setCopied(false)
    } catch {
      if (controller.signal.aborted) return
      setFailed(true)
    } finally {
      if (abortRef.current === controller) setLoading(false)
    }
  }

  function chooseStars(n: number) {
    if (n === stars) return
    setStars(n)
    setChips([])
    requestAnimationFrame(() => reviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  function toggleChip(chip: string) {
    setChips((c) => (c.includes(chip) ? c.filter((x) => x !== chip) : [...c, chip]))
  }

  function nextVersion() {
    if (drafts.length > 1) {
      const next = (index + 1) % drafts.length
      setIndex(next)
      setText(drafts[next])
      setCopied(false)
    } else {
      generate(stars, chips)
    }
  }

  async function copyAndPost() {
    const review = text.trim()
    if (!review) return
    try {
      await navigator.clipboard.writeText(review)
      setCopied(true)
    } catch {
      setCopied(false)
    }
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_id: business.id, stars_given: stars, template_index: index, was_submitted: true }),
    }).catch(() => {})
    window.open(googleUrl, '_blank', 'noopener')
    setScreen('posted')
  }

  async function sendPrivate() {
    if (!privateText.trim() || sending) return
    setSending(true)
    setSendError('')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: business.id, stars_given: stars, feedback_text: privateText.trim() }),
      })
      if (!res.ok) throw new Error()
      setScreen('private_sent')
    } catch {
      setSendError('Message not sent. Check your connection and try again.')
    } finally {
      setSending(false)
    }
  }

  const chipPrompt =
    stars >= 4 ? 'Tap what you liked' : stars <= 2 ? 'Tap what went wrong' : 'Tap what stood out'

  return (
    <main className="min-h-dvh bg-[#FAFBFC]">
      <div className="mx-auto max-w-[440px] px-5 pt-7 pb-36">
        <Header business={business} />

        {screen === 'review' && (
          <>
            <section className="mt-8">
              <h1 className={`text-[28px] leading-[1.15] font-semibold tracking-[-0.02em] ${INK}`}>
                How was your experience?
              </h1>
              <div className="mt-4">
                <StarRating value={stars} onSelect={chooseStars} />
              </div>
            </section>

            {stars > 0 && (
              <section ref={reviewRef} className="mt-5 scroll-mt-6 animate-[fadeUp_240ms_ease-out]">
                <p className={`text-[15px] font-medium ${INK}`}>
                  {chipPrompt} <span className={`font-normal ${MUTED}`}>optional</span>
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {chipOptions.map((chip) => {
                    const on = chips.includes(chip)
                    return (
                      <button
                        key={chip}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleChip(chip)}
                        className="rounded-full border px-3.5 py-2 text-[14px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
                        style={
                          on
                            ? { background: 'var(--brand)', borderColor: 'var(--brand)', color: 'var(--brand-ink)' }
                            : { background: '#FFFFFF', borderColor: '#E4E6EB', color: '#16181D' }
                        }
                      >
                        {chip}
                      </button>
                    )
                  })}
                </div>

                <div className="mt-7">
                  <div className="flex items-baseline justify-between">
                    <p className={`text-[15px] font-medium ${INK}`}>Your review</p>
                    <p className={`text-[13px] ${MUTED}`} aria-live="polite">
                      {loading ? (text ? 'Updating…' : 'Writing…') : text ? 'Tap to edit' : ''}
                    </p>
                  </div>

                  {!text && loading ? (
                    <div className="mt-2 rounded-2xl border border-[#E4E6EB] bg-white p-4" aria-busy="true">
                      <div className="h-3 w-11/12 animate-pulse rounded bg-[#EEF0F3]" />
                      <div className="mt-2.5 h-3 w-3/4 animate-pulse rounded bg-[#EEF0F3]" />
                      <div className="mt-2.5 h-3 w-1/2 animate-pulse rounded bg-[#EEF0F3]" />
                    </div>
                  ) : (
                    <textarea
                      value={text}
                      onChange={(e) => {
                        setText(e.target.value)
                        setCopied(false)
                      }}
                      rows={4}
                      placeholder={failed ? 'Couldn’t write a review right now. Type a few words here instead.' : ''}
                      aria-label="Your review"
                      className={`mt-2 w-full resize-none rounded-2xl border border-[#E4E6EB] bg-white px-4 py-3 text-[16px] leading-relaxed ${INK} transition-opacity placeholder:text-[#A2A7B1] focus:border-[var(--brand)] focus:outline-none focus:ring-4 focus:ring-[var(--brand-soft)] ${loading ? 'opacity-60' : ''}`}
                    />
                  )}

                  {text && drafts.length > 0 && (
                    <button
                      onClick={nextVersion}
                      disabled={loading}
                      className={`mt-2 inline-flex items-center gap-1.5 py-1 text-[14px] font-medium ${MUTED} disabled:opacity-50`}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Show another version
                    </button>
                  )}

                  {debugMode && debugInfo && (
                    <pre className="mt-4 overflow-x-auto rounded-xl bg-[#16181D] p-3 text-[11px] leading-snug text-[#D7DAE0]">{debugInfo}</pre>
                  )}
                </div>
              </section>
            )}
          </>
        )}

        {screen === 'posted' && (
          <section className="mt-12 animate-[fadeUp_240ms_ease-out]">
            <span className="grid h-14 w-14 place-items-center rounded-full" style={{ background: 'var(--brand-soft)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" stroke="var(--brand)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h1 className={`mt-5 text-[26px] font-semibold tracking-[-0.02em] ${INK}`}>
              {copied ? 'Copied. Now paste it in Google' : 'Paste it in Google'}
            </h1>
            <p className={`mt-2 text-[15px] leading-relaxed ${MUTED}`}>
              Choose your stars on Google, tap the text box, paste, then tap Post.
            </p>
            <p className={`mt-5 select-all rounded-2xl border border-[#E4E6EB] bg-white px-4 py-3 text-[15px] leading-relaxed ${INK}`}>
              {text}
            </p>
            <div className="mt-4 flex gap-2">
              <a
                href={googleUrl}
                target="_blank"
                rel="noopener"
                className="flex-1 rounded-2xl px-4 py-3.5 text-center text-[15px] font-semibold"
                style={{ background: 'var(--brand)', color: 'var(--brand-ink)' }}
              >
                Open Google
              </a>
              <button
                onClick={() => navigator.clipboard?.writeText(text).then(() => setCopied(true)).catch(() => {})}
                className={`flex-1 rounded-2xl border border-[#E4E6EB] bg-white px-4 py-3.5 text-[15px] font-semibold ${INK}`}
              >
                {copied ? 'Copied' : 'Copy again'}
              </button>
            </div>
            <p className={`mt-8 text-[14px] ${MUTED}`}>Thanks for supporting {business.business_name}.</p>
          </section>
        )}

        {screen === 'private' && (
          <section className="mt-8">
            <h1 className={`text-[24px] font-semibold tracking-[-0.02em] ${INK}`}>Message the owner</h1>
            <p className={`mt-1.5 text-[15px] ${MUTED}`}>Only {business.business_name} will see this.</p>
            <textarea
              value={privateText}
              onChange={(e) => setPrivateText(e.target.value)}
              rows={5}
              autoFocus
              aria-label="Message to the owner"
              className={`mt-5 w-full resize-none rounded-2xl border border-[#E4E6EB] bg-white px-4 py-3 text-[16px] leading-relaxed ${INK} focus:border-[var(--brand)] focus:outline-none focus:ring-4 focus:ring-[var(--brand-soft)]`}
            />
            {sendError && <p className="mt-3 rounded-xl bg-[#FEF3F2] px-4 py-3 text-[14px] text-[#B42318]">{sendError}</p>}
            <button onClick={() => setScreen('review')} className={`mt-3 py-1 text-[14px] font-medium ${MUTED}`}>
              Back
            </button>
          </section>
        )}

        {screen === 'private_sent' && (
          <section className="mt-12">
            <h1 className={`text-[26px] font-semibold tracking-[-0.02em] ${INK}`}>Message sent</h1>
            <p className={`mt-2 text-[15px] leading-relaxed ${MUTED}`}>
              {business.business_name} will read it. You can still post a public review too.
            </p>
            <button
              onClick={() => setScreen('review')}
              className={`mt-6 w-full rounded-2xl border border-[#E4E6EB] bg-white px-5 py-4 text-[16px] font-semibold ${INK}`}
            >
              Back to review
            </button>
          </section>
        )}
      </div>

      {/* Sticky action bar - one thumb-reachable button */}
      {((screen === 'review' && stars > 0) || screen === 'private') && (
        <div className="fixed inset-x-0 bottom-0 border-t border-[#E4E6EB] bg-white/90 backdrop-blur">
          <div className="mx-auto max-w-[440px] px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
            {screen === 'review' ? (
              <>
                <PrimaryButton onClick={copyAndPost} disabled={!text.trim()}>
                  Copy &amp; post on Google
                </PrimaryButton>
                {stars <= 3 && (
                  <button
                    onClick={() => {
                      setPrivateText(text)
                      setScreen('private')
                    }}
                    className={`mt-1.5 w-full py-1.5 text-[14px] font-medium ${MUTED}`}
                  >
                    Or message the owner privately
                  </button>
                )}
              </>
            ) : (
              <PrimaryButton onClick={sendPrivate} disabled={!privateText.trim() || sending}>
                {sending ? 'Sending…' : 'Send to owner'}
              </PrimaryButton>
            )}
          </div>
        </div>
      )}
    </main>
  )
}

function Header({ business }: { business: PublicBusinessInfo }) {
  const [logoFailed, setLogoFailed] = useState(false)
  const initials = business.business_name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  return (
    <header className="flex items-center gap-3.5">
      {business.logo_url && !logoFailed ? (
        // eslint-disable-next-line @next/next/no-img-element -- logos are arbitrary Supabase URLs
        <img
          src={business.logo_url}
          alt=""
          className="h-12 w-12 shrink-0 rounded-xl border border-[#E4E6EB] bg-white object-contain"
          onError={() => setLogoFailed(true)}
        />
      ) : (
        <span
          className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-[17px] font-semibold"
          style={{ background: 'var(--brand)', color: 'var(--brand-ink)' }}
          aria-hidden="true"
        >
          {initials}
        </span>
      )}
      <div className="min-w-0">
        <p className={`line-clamp-2 text-[17px] leading-snug font-semibold ${INK}`}>{business.business_name}</p>
        {business.location && <p className={`truncate text-[14px] ${MUTED}`}>{business.location}</p>}
      </div>
    </header>
  )
}

function PrimaryButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-2xl px-5 py-4 text-[16px] font-semibold transition-transform active:scale-[0.98] disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
      style={{ background: 'var(--brand)', color: 'var(--brand-ink)' }}
    >
      {children}
    </button>
  )
}
