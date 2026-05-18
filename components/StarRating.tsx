'use client'

interface StarRatingProps {
  value: number
  onSelect: (stars: number) => void
  disabled?: boolean
}

export function StarRating({ value, onSelect, disabled }: StarRatingProps) {
  return (
    <div className="flex gap-3">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onSelect(star)}
          disabled={disabled}
          className="text-5xl transition-transform hover:scale-125 active:scale-95 disabled:opacity-50"
        >
          {star <= value ? '⭐' : '☆'}
        </button>
      ))}
    </div>
  )
}
