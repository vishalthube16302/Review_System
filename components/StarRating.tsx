'use client'

interface StarRatingProps {
  value: number
  onSelect: (stars: number) => void
  disabled?: boolean
  size?: number
}

const LABELS = ['', 'Poor', 'Not great', 'Okay', 'Good', 'Loved it']

function Star({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2.6l2.82 5.92 6.48.82-4.76 4.5 1.2 6.43L12 17.1l-5.74 3.17 1.2-6.43-4.76-4.5 6.48-.82z"
        fill={filled ? '#F5B301' : 'transparent'}
        stroke={filled ? '#F5B301' : '#C9CDD4'}
        strokeWidth="1.6"
        strokeLinejoin="round"
        style={{ transition: 'fill 160ms ease, stroke 160ms ease' }}
      />
    </svg>
  )
}

export function StarRating({ value, onSelect, disabled, size = 46 }: StarRatingProps) {
  return (
    <div>
      <div role="radiogroup" aria-label="Your rating" className="flex gap-1.5 -ml-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star > 1 ? 's' : ''} - ${LABELS[star]}`}
            onClick={() => onSelect(star)}
            disabled={disabled}
            className="p-1.5 rounded-xl transition-transform active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] disabled:opacity-50"
          >
            <Star filled={star <= value} size={size} />
          </button>
        ))}
      </div>
      <p className="h-6 mt-1 text-[15px] font-medium text-[#16181D]" aria-live="polite">
        {LABELS[value]}
      </p>
    </div>
  )
}
