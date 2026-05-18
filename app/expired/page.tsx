export default function ExpiredPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">⏰</div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Link Expired</h1>
        <p className="text-slate-500 text-sm leading-relaxed">
          This review link is no longer active. Please contact the business owner to renew their plan.
        </p>
      </div>
    </div>
  )
}
