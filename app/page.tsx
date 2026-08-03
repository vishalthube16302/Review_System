import Link from 'next/link'
import { BUSINESS_CATEGORIES } from '@/lib/business-categories'

export default function LandingPage() {
  return (
    <div className="landing">
      {/* ---------- Nav ---------- */}
      <header className="nav">
        <div className="nav-inner">
          <div className="logo">
            <span className="logo-mark" aria-hidden="true" />
            ReviewBoost
          </div>
          <div className="nav-links">
            <a href="#how-it-works">How it works</a>
            <a href="#who-its-for">Who it&apos;s for</a>
            <a href="#features">Features</a>
            <Link href="/customer/login" className="nav-secondary">
              Restaurant / business login
            </Link>
            <Link href="/admin/login" className="nav-cta">
              Login
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ---------- Hero ---------- */}
        <section className="hero">
          <div className="hero-inner">
            <p className="eyebrow">Google reviews, made effortless</p>
            <h1>
              Turn every happy customer
              <br />
              into a <span className="hl">5-star Google review</span>
            </h1>
            <p className="hero-sub">
              One QR code. One tap. A short, honest, AI-written review your customers actually
              want to post &mdash; and a private channel to catch unhappy ones before they ever
              reach Google.
            </p>
            <div className="hero-ctas">
              <a href="#how-it-works" className="btn btn-primary">
                See how it works
              </a>
              <Link href="/admin/login" className="btn btn-ghost">
                Login to your account
              </Link>
            </div>
          </div>

          {/* Signature element: QR scan -> star rating -> posted review flow */}
          <div className="flow" aria-hidden="true">
            <div className="flow-card">
              <div className="qr">
                {Array.from({ length: 49 }).map((_, i) => (
                  <span key={i} className={qrCell(i) ? 'on' : ''} />
                ))}
              </div>
              <p className="flow-label">Scan at checkout</p>
            </div>
            <div className="flow-arrow">→</div>
            <div className="flow-card">
              <div className="stars">
                {'★★★★★'.split('').map((s, i) => (
                  <span key={i}>{s}</span>
                ))}
              </div>
              <p className="flow-label">Rate the visit</p>
            </div>
            <div className="flow-arrow">→</div>
            <div className="flow-card">
              <div className="posted">
                <span className="g">G</span>
                <span className="check">✓</span>
              </div>
              <p className="flow-label">Posted to Google</p>
            </div>
          </div>
        </section>

        {/* ---------- How it works ---------- */}
        <section id="how-it-works" className="steps">
          <p className="eyebrow center">How it works</p>
          <h2 className="section-title center">Three steps. Under thirty seconds.</h2>

          <div className="steps-grid">
            <div className="step">
              <span className="step-num">01</span>
              <h3>Customer scans your QR code</h3>
              <p>
                Printed at your counter, table, or invoice. No app to download, no account to
                create &mdash; it opens straight to your branded review page.
              </p>
            </div>
            <div className="step">
              <span className="step-num">02</span>
              <h3>They rate their visit</h3>
              <p>
                4&ndash;5 stars: our AI writes a few short, natural review drafts they can pick
                from. Lower ratings are quietly routed to a private feedback form instead of
                Google &mdash; so you hear about problems before the public does.
              </p>
            </div>
            <div className="step">
              <span className="step-num">03</span>
              <h3>One tap posts it to Google</h3>
              <p>
                They copy, paste, and post &mdash; on their own Google account, in their own
                words. We never post on anyone&apos;s behalf.
              </p>
            </div>
          </div>
        </section>

        {/* ---------- Who it's for ---------- */}
        <section id="who-its-for" className="who">
          <p className="eyebrow center">Built for any business</p>
          <h2 className="section-title center">Not just restaurants</h2>
          <p className="section-sub center">
            ReviewBoost adapts the review it writes to what you actually do &mdash; a factory
            gets reviews about delivery and quality, a salon gets reviews about staff and
            service.
          </p>

          <div className="category-grid">
            {BUSINESS_CATEGORIES.filter((c) => c.value !== 'other').map((c) => (
              <div key={c.value} className="category-chip">
                {c.label.split(' (')[0]}
              </div>
            ))}
          </div>
        </section>

        {/* ---------- Features ---------- */}
        <section id="features" className="features">
          <p className="eyebrow center">What you get</p>
          <h2 className="section-title center">Everything to protect and grow your rating</h2>

          <div className="feature-grid">
            <div className="feature">
              <h3>AI-written, human-sounding reviews</h3>
              <p>
                Short, plain, believable drafts &mdash; never the same review twice, never
                over-the-top language that gives away it was generated.
              </p>
            </div>
            <div className="feature">
              <h3>Private feedback, not public damage</h3>
              <p>
                Unhappy customers get a direct line to you, not a permanent 1-star post on your
                profile.
              </p>
            </div>
            <div className="feature">
              <h3>One account, every location</h3>
              <p>
                Add as many branches as you run &mdash; each with its own QR code and its own
                numbers, all in one dashboard.
              </p>
            </div>
            <div className="feature">
              <h3>Real numbers, not vanity metrics</h3>
              <p>
                Scans, submit rate, and star trend over time &mdash; so you know the QR code is
                actually working.
              </p>
            </div>
            <div className="feature">
              <h3>Flexible billing, no lock-in</h3>
              <p>
                Pay for exactly the number of days you need. No forced annual contract, no
                surprise gateway fees.
              </p>
            </div>
            <div className="feature">
              <h3>Your QR code never changes</h3>
              <p>
                Renew, upgrade, or extend your plan and the QR codes you already printed keep
                working &mdash; nothing to reprint.
              </p>
            </div>
          </div>
        </section>

        {/* ---------- Final CTA ---------- */}
        <section className="cta">
          <h2>Ready to see it on your own business?</h2>
          <p>Accounts are set up directly &mdash; log in or get in touch to get started.</p>
          <Link href="/admin/login" className="btn btn-primary btn-lg">
            Login to your account
          </Link>
        </section>
      </main>

      <footer className="footer">
        <div className="logo footer-logo">
          <span className="logo-mark" aria-hidden="true" />
          ReviewBoost
        </div>
        <div className="footer-links">
          <Link href="/customer/login">Business login</Link>
          <Link href="/admin/login">Admin login</Link>
        </div>
      </footer>
    </div>
  )
}

// Deterministic pseudo-QR pattern for the hero's signature visual - not a
// real scannable code, purely decorative, but built from the actual grid
// math a QR code uses so it reads as unmistakably "QR" at a glance.
function qrCell(i: number): boolean {
  const row = Math.floor(i / 7)
  const col = i % 7
  if ((row < 3 && col < 3) || (row < 3 && col > 3) || (row > 3 && col < 3)) {
    const inner = row % 2 === 0 || col % 2 === 0
    return inner
  }
  return (row + col) % 3 === 0
}
