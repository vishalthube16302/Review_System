'use client'

const QUICK_PICKS = [30, 60, 90, 180, 365]

export function DurationPicker({
  value,
  onChange,
}: {
  value: number
  onChange: (days: number) => void
}) {
  const isCustom = !QUICK_PICKS.includes(value)

  return (
    <div>
      <div className="grid grid-cols-5 gap-2 mb-2">
        {QUICK_PICKS.map((days) => (
          <button
            key={days}
            type="button"
            onClick={() => onChange(days)}
            className={`py-2 rounded-lg text-sm font-medium border-2 transition ${
              value === days
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300'
            }`}
          >
            {days}d
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          placeholder="Custom days"
          value={isCustom ? value : ''}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10)
            if (!isNaN(n) && n > 0) onChange(n)
          }}
          className={`flex-1 border-2 rounded-lg px-3 py-2 text-sm focus:outline-none ${
            isCustom ? 'border-indigo-600' : 'border-slate-200'
          }`}
        />
        <span className="text-sm text-slate-500">days</span>
      </div>
      <p className="text-xs text-slate-400 mt-1">
        Selected: <span className="font-medium text-slate-600">{value} days</span>
      </p>
    </div>
  )
}
