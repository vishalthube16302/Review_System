import { createAdminClient } from '@/lib/supabase-server'

export default async function FeedbackPage() {
  const supabase = createAdminClient()

  const { data: feedback } = await supabase
    .from('private_feedback')
    .select('*, business_pages(business_name)')
    .order('submitted_at', { ascending: false })

  const unreadCount = feedback?.filter((f) => !f.is_read).length ?? 0

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Feedback Inbox</h1>
      <p className="text-slate-600 text-sm mb-6">
        {unreadCount} unread feedback from customers who rated 1-3 stars
      </p>

      <div className="space-y-4">
        {feedback?.map((f) => (
          <div
            key={f.id}
            className={`rounded-lg p-4 border-l-4 ${
              f.is_read
                ? 'bg-slate-50 border-slate-200'
                : 'bg-yellow-50 border-yellow-400'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-slate-900">
                  {f.business_pages?.business_name}
                </p>
                <p className="text-sm text-slate-600">
                  {'⭐'.repeat(f.stars_given)} — {new Date(f.submitted_at).toLocaleString()}
                </p>
              </div>
              {!f.is_read && (
                <span className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs font-medium rounded">
                  Unread
                </span>
              )}
            </div>
            <p className="text-slate-700 text-sm">{f.feedback_text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
