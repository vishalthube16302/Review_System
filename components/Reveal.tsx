'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Fades + slides a child element into place the first time it scrolls into
 * view, instead of animating on page load (where it'd be invisible above
 * the fold anyway). `delay` staggers a group of these so a row of cards
 * reveals left-to-right rather than all at once.
 *
 * Respects prefers-reduced-motion via CSS (see .reveal in globals.css) -
 * this component only toggles a class, the actual transition/skip lives in
 * CSS so motion-sensitive users get an instant, non-animated appearance.
 */
export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      {children}
    </div>
  )
}
