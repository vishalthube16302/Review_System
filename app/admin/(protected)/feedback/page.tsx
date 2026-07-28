import { createAdminClient } from '@/lib/supabase-server'
import { FeedbackCard } from '@/components/FeedbackCard'

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
          <FeedbackCard
            key={f.id}
            id={f.id}
            businessName={f.business_pages?.business_name}
            stars={f.stars_given}
            text={f.feedback_text}
            submittedAt={f.submitted_at}
            initialIsRead={f.is_read}
          />
        ))}
      </div>
    </div>
  )
}
