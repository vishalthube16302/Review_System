'use client'

export function PrintReceiptButton() {
  return (
    <button
      onClick={() => window.print()}
      className="w-full mt-4 bg-slate-900 text-white py-3 rounded-lg font-semibold hover:bg-slate-800 print:hidden"
    >
      Print Receipt
    </button>
  )
}
