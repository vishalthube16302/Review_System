'use client'

import { useState } from 'react'

interface FeedbackCardProps {
  id: string
  businessName?: string
  stars: number
  text: string
  submittedAt: string
  initialIsRead: boolean
}

export function FeedbackCard({
  id,
  businessName,
  stars,
  text,
  submittedAt,
  initialIsRead,
}: FeedbackCardProps) {
  const [isRead, setIsRead] = useState(initialIsRead)
  const [updating, setUpdating] = useState(false)

  async function toggleRead() {
    setUpdating(true)
    try {
      const res = await fetch(`/api/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: !isRead }),
      })
      if (res.ok) setIsRead(!isRead)
    } catch {
      // Network error - button just resets below, admin can retry the click.
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div
      className={`rounded-lg p-4 border-l-4 ${
        isRead ? 'bg-slate-50 border-slate-200' : 'bg-yellow-50 border-yellow-400'
      }`}
    >
      <div className="flex items-start justify-between mb-2 gap-3">
        <div>
          {businessName && <p className="font-semibold text-slate-900">{businessName}</p>}
          <p className="text-sm text-slate-600">
            {'⭐'.repeat(stars)} — {new Date(submittedAt).toLocaleString()}
          </p>
        </div>
        <button
          onClick={toggleRead}
          disabled={updating}
          className={`px-2 py-1 text-xs font-medium rounded shrink-0 ${
            isRead
              ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
              : 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300'
          }`}
        >
          {isRead ? 'Mark unread' : 'Mark as read'}
        </button>
      </div>
      <p className="text-slate-700 text-sm">{text}</p>
    </div>
  )
}
