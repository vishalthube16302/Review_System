'use client'

interface StatusBadgeProps {
  isActive: boolean
  expiresAt: string
}

export function StatusBadge({ isActive, expiresAt }: StatusBadgeProps) {
  const daysLeft = Math.ceil(
    (new Date(expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  )

  if (!isActive) {
    return <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">Inactive</span>
  }

  if (daysLeft < 7) {
    return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">Expiring Soon</span>
  }

  return <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Active</span>
}
