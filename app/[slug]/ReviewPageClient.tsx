'use client'

import { useMemo, useRef, useState } from 'react'
import { StarRating } from '@/components/StarRating'
import { getNegativeChips, getPositiveChips, NOTE_MAX_LENGTH } from '@/lib/review-chips'
import type { PublicBusinessInfo } from '@/types'

type Step = 'tell' | 'drafts' | 'done' | 'private' | 'private_done'
type Source = 'ai' | 'template_fallback' | 'error' | null

const INK = 'text-[#16181D]'
const MUTED = 'text-[#6A6F7B]'

export default function ReviewPageClient({ business }: { business: PublicBusinessInfo }) {
  const [stars, setStars] = useState(0)
  const [step, setStep] = useState<Step>('tell')
  const [highlights, setHighlights] = useState<string[]>([])
  const [improvements, setImprovements] = useState<string[]>([])
  const [note, setNote] = useState('')

  const [drafts, setDrafts] = useState<string[]>([])
  const [selected, setSelected] = useState(0)
  const [editedText, setEditedText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const [privateText, setPrivateText] = useState('')
  const [sending, setSending] = useState(false)

  const [debugMode] = useState(
    () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1'
  )
  const [source, setSource] = useState<Source>(null)
  const [debugDetail, setDebugDetail] = useState('')

  const positiveChips = useMemo(
    () => getPositiveChips(business.business_category, business.keywords),
    [business.business_category, business.keywords]
  )
  const negativeChips = useMemo(() => getNegativeChips(business.business_category), [business.business_category])
  const tellRef = useRef<HTMLDivElement>(null)

  const googleUrl = `https://search.google.com/local/writereview?placeid=${business.google_place_id}`
  const progress = step === 'tell' ? (stars ? 2 : 1) : 3

  function chooseStars(n: number) {
    setStars(n)
    // Clear chips that don't apply at the new rating.
    if (n === 5) setImprovements([])
    if (n <= 2) setHighlights([])
    requestAnimationFrame(() => tellRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  function toggle(list: string[], set: (v: string[]) => void, chip: string) {
    set(list.includes(chip) ? list.filter((c) => c !== chip) : [...list, chip])
  }

  async function writeReview() {
    setStep('drafts')
    setLoading(true)
    setError('')
    setCopied(false)
    try {
      const res = await fetch('/api/generate-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: business.id, stars, highlights, improvements, note, debug: debugMode }),
      })
      const data = await res.json().catch(() => ({}))
      if (debugMode) setDebugDetail(JSON.stringify({ status: res.status, ...data, reviews: undefined }, null, 1))
      if (!res.ok || !Array.isArray(data.reviews) || data.reviews.length === 0) {
        setSource('error')
        throw new Error(res.status === 429 ? 'Too many tries from this network. Wait a minute and try again.' : 'Couldn’t write drafts. Try again, or write your own below.')
      }
      setSource(data.source)
      setDrafts(data.reviews)
      setSelected(0)
      setEditedText(data.reviews[0])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t write drafts.')
      if (!drafts.length) setEditedText(note)
    } finally {
      setLoading(false)
    }
  }

  function selectDraft(i: number) {
    setSelected(i)
    setEditedText(drafts[i])
    setCopied(false)
  }

  async function copyAndOpenGoogle() {
    const text = editedText.trim()
    if (!text) return
    let ok = false
    try {
      await navigator.clipboard.writeText(text)
      ok = true
    } catch {
      ok = false
    }
    setCopied(ok)

    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_id: business.id, stars_given: stars, template_index: selected, was_submitted: true }),
    }).catch(() => {})

    window.open(googleUrl, '_blank', 'noopener')
    setStep('done')
  }

  function openPrivate() {
    const parts = [
      improvements.length ? `Could be better: ${improvements.join(', ')}.` : '',
      highlights.length ? `Liked: ${highlights.join(', ')}.` : '',
      note,
    ].filter(Boolean)
    setPrivateText(parts.join(' '))
    setError('')
    setStep('private')
  }

  async function sendPrivate() {
    if (!privateText.trim() || sending) return
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: business.id, stars_given: stars, feedback_text: privateText.trim() }),
      })
      if (!res.ok) throw new Error()
      setStep('private_done')
    } catch {
      setError('Message not sent. Check your connection and try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="min-h-dvh bg-[#FAFBFC]">
      <div className="mx-auto max-w-[440px] px-5 pt-7 pb-32">
        <Header business={business} />

        {step !== 'private_done' && step !== 'done' && (
          <div className="mt-6 flex gap-1.5" aria-hidden="true">
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className="h-1 flex-1 rounded-full transition-colors duration-300"
                style={{ background: n <= progress ? 'var(--brand)' : '#E4E6EB' }}
              />
            ))}
          </div>
        )}

        {step === 'tell' && (
          <>
            <section className="mt-8">
              <h1 className={`text-[28px] leading-[1.15] font-semibold tracking-[-0.02em] ${INK}`}>
                How was your experience?
              </h1>
              <p className={`mt-2 text-[15px] ${MUTED}`}>Tap to rate. It takes under a minute.</p>
              <div className="mt-5">
                <StarRating value={stars} onSelect={chooseStars} />
              </div>
            </section>

            {stars > 0 && (
              <section ref={tellRef} className="mt-6 scroll-mt-6 animate-[fadeUp_240ms_ease-out]">
                {stars >= 3 && (
                  <ChipGroup
                    title={stars === 5 ? 'What did you like?' : 'What went well?'}
                    chips={positiveChips}
                    selected={highlights}
                    onToggle={(c) => toggle(highlights, setHighlights, c)}
                  />
                )}
                {stars <= 4 && (
                  <div className={stars >= 3 ? 'mt-6' : ''}>
                    <ChipGroup
                      title={stars <= 2 ? 'What went wrong?' : 'What could be better?'}
                      chips={negativeChips}
                      selected={improvements}
                      onToggle={(c) => toggle(improvements, setImprovements, c)}
                    />
                  </div>
                )}

                <label className="mt-6 block">
                  <span className={`text-[15px] font-medium ${INK}`}>Anything else? <span className={`font-normal ${MUTED}`}>Optional</span></span>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX_LENGTH))}
                    rows={3}
                    placeholder="A few words in any language - Hindi, Marathi, English…"
                    className={`mt-2 w-full resize-none rounded-2xl border border-[#E4E6EB] bg-white px-4 py-3 text-[15px] leading-relaxed ${INK} placeholder:text-[#A2A7B1] focus:border-[var(--brand)] focus:outline-none focus:ring-4 focus:ring-[var(--brand-soft)]`}
                  />
                </label>
              </section>
            )}
          </>
        )}

        {step === 'drafts' && (
          <section className="mt-8">
            <div className="flex items-center justify-between">
              <h1 className={`text-[24px] font-semibold tracking-[-0.02em] ${INK}`}>Your review</h1>
              <button onClick={() => setStep('tell')} className={`text-[14px] font-medium ${MUTED} underline-offset-4 hover:underline`}>
                Change answers
              </button>
            </div>
            <p className={`mt-1.5 text-[15px] ${MUTED}`}>
              Pick the one that sounds most like you, then edit anything.
            </p>

            {loading ? (
              <div className="mt-5 overflow-hidden rounded-2xl border border-[#E4E6EB] bg-white" aria-busy="true" aria-label="Writing drafts">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="border-b border-[#EEF0F3] p-4 last:border-0">
                    <div className="h-3 w-11/12 animate-pulse rounded bg-[#EEF0F3]" />
                    <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-[#EEF0F3]" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                {drafts.length > 0 && (
                  <div role="radiogroup" aria-label="Drafts" className="mt-5 overflow-hidden rounded-2xl border border-[#E4E6EB] bg-white">
                    {drafts.map((d, i) => (
                      <button
                        key={i}
                        role="radio"
                        aria-checked={selected === i}
                        onClick={() => selectDraft(i)}
                        className="flex w-full gap-3 border-b border-[#EEF0F3] p-4 text-left last:border-0 focus-visible:bg-[var(--brand-soft)] focus-visible:outline-none"
                        style={selected === i ? { background: 'var(--brand-soft)' } : undefined}
                      >
                        <span
                          className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2"
                          style={{ borderColor: selected === i ? 'var(--brand)' : '#C9CDD4' }}
                        >
                          {selected === i && <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--brand)' }} />}
                        </span>
                        <span className={`text-[15px] leading-relaxed ${INK}`}>{d}</span>
                      </button>
                    ))}
                  </div>
                )}

                {error && <p className="mt-4 rounded-xl bg-[#FEF3F2] px-4 py-3 text-[14px] text-[#B42318]">{error}</p>}

                <label className="mt-6 block">
                  <span className={`text-[15px] font-medium ${INK}`}>Edit before posting</span>
                  <textarea
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    rows={4}
                    className={`mt-2 w-full resize-none rounded-2xl border border-[#E4E6EB] bg-white px-4 py-3 text-[15px] leading-relaxed ${INK} focus:border-[var(--brand)] focus:outline-none focus:ring-4 focus:ring-[var(--brand-soft)]`}
                  />
                </label>

                <button onClick={writeReview} className={`mt-3 text-[14px] font-medium ${MUTED} underline-offset-4 hover:underline`}>
                  Try different wording
                </button>

                {debugMode && (
                  <pre className="mt-6 overflow-x-auto rounded-xl bg-[#16181D] p-3 text-[11px] leading-snug text-[#D7DAE0]">
                    {`source: ${source}\n${debugDetail}`}
                  </pre>
                )}
              </>
            )}
          </section>
        )}

        {step === 'done' && (
          <section className="mt-12 animate-[fadeUp_240ms_ease-out]">
            <span className="grid h-14 w-14 place-items-center rounded-full" style={{ background: 'var(--brand-soft)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" stroke="var(--brand)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h1 className={`mt-5 text-[26px] font-semibold tracking-[-0.02em] ${INK}`}>
              {copied ? 'Review copied' : 'Almost done'}
            </h1>
            <ol className={`mt-4 space-y-3 text-[15px] leading-relaxed ${INK}`}>
              <li className="flex gap-3"><Num n={1} />Google opened in a new tab. Choose your stars there too.</li>
              <li className="flex gap-3"><Num n={2} />{copied ? 'Tap the text box, then paste.' : 'Copy the text below and paste it into the box.'}</li>
              <li className="flex gap-3"><Num n={3} />Tap Post.</li>
            </ol>
            <p className={`mt-6 select-all rounded-2xl border border-[#E4E6EB] bg-white px-4 py-3 text-[15px] leading-relaxed ${INK}`}>
              {editedText}
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <a href={googleUrl} target="_blank" rel="noopener" className="rounded-2xl px-5 py-4 text-center text-[16px] font-semibold" style={{ background: 'var(--brand)', color: 'var(--brand-ink)' }}>
                Open Google again
              </a>
              <button
                onClick={() => navigator.clipboard?.writeText(editedText).then(() => setCopied(true)).catch(() => {})}
                className={`rounded-2xl border border-[#E4E6EB] bg-white px-5 py-4 text-[16px] font-semibold ${INK}`}
              >
                Copy again
              </button>
            </div>
            <p className={`mt-8 text-[14px] ${MUTED}`}>Thanks for helping {business.business_name}.</p>
          </section>
        )}

        {step === 'private' && (
          <section className="mt-8">
            <h1 className={`text-[24px] font-semibold tracking-[-0.02em] ${INK}`}>Message the owner</h1>
            <p className={`mt-1.5 text-[15px] ${MUTED}`}>Only {business.business_name} will see this. It won’t appear on Google.</p>
            <textarea
              value={privateText}
              onChange={(e) => setPrivateText(e.target.value)}
              rows={5}
              autoFocus
              placeholder="What happened, and what would make it right?"
              className={`mt-5 w-full resize-none rounded-2xl border border-[#E4E6EB] bg-white px-4 py-3 text-[15px] leading-relaxed ${INK} placeholder:text-[#A2A7B1] focus:border-[var(--brand)] focus:outline-none focus:ring-4 focus:ring-[var(--brand-soft)]`}
            />
            {error && <p className="mt-3 rounded-xl bg-[#FEF3F2] px-4 py-3 text-[14px] text-[#B42318]">{error}</p>}
            <button onClick={() => setStep('tell')} className={`mt-3 text-[14px] font-medium ${MUTED} underline-offset-4 hover:underline`}>
              Back to public review
            </button>
          </section>
        )}

        {step === 'private_done' && (
          <section className="mt-12">
            <h1 className={`text-[26px] font-semibold tracking-[-0.02em] ${INK}`}>Message sent</h1>
            <p className={`mt-2 text-[15px] leading-relaxed ${MUTED}`}>
              {business.business_name} will read it. You can still share a public review on Google if you’d like.
            </p>
            <button
              onClick={() => setStep('tell')}
              className={`mt-6 w-full rounded-2xl border border-[#E4E6EB] bg-white px-5 py-4 text-[16px] font-semibold ${INK}`}
            >
              Write a public review
            </button>
          </section>
        )}
      </div>

      {/* Sticky action bar - thumb-reachable on phones */}
      {((step === 'tell' && stars > 0) || (step === 'drafts' && !loading) || step === 'private') && (
        <div className="fixed inset-x-0 bottom-0 border-t border-[#E4E6EB] bg-white/90 backdrop-blur">
          <div className="mx-auto max-w-[440px] px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
            {step === 'tell' && (
              <>
                <PrimaryButton onClick={writeReview}>Write my review</PrimaryButton>
                <button onClick={openPrivate} className={`mt-2 w-full py-1.5 text-[14px] font-medium ${MUTED}`}>
                  Tell the owner privately instead
                </button>
              </>
            )}
            {step === 'drafts' && (
              <PrimaryButton onClick={copyAndOpenGoogle} disabled={!editedText.trim()}>
                Copy and open Google
              </PrimaryButton>
            )}
            {step === 'private' && (
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

function ChipGroup({
  title,
  chips,
  selected,
  onToggle,
}: {
  title: string
  chips: string[]
  selected: string[]
  onToggle: (chip: string) => void
}) {
  return (
    <fieldset>
      <legend className={`text-[15px] font-medium ${INK}`}>
        {title} <span className={`font-normal ${MUTED}`}>Pick any</span>
      </legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map((chip) => {
          const on = selected.includes(chip)
          return (
            <button
              key={chip}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(chip)}
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
    </fieldset>
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

function Num({ n }: { n: number }) {
  return (
    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#EEF0F3] text-[13px] font-semibold text-[#16181D]">
      {n}
    </span>
  )
}
