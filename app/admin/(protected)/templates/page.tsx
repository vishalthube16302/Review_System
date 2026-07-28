import { createAdminClient } from '@/lib/supabase-server'

export default async function TemplatesPage() {
  const supabase = createAdminClient()

  const { data: templates } = await supabase
    .from('review_templates')
    .select('*')
    .order('stars', { ascending: true })
    .order('created_at', { ascending: true })

  const grouped = {
    5: templates?.filter((t) => t.stars === 5) ?? [],
    4: templates?.filter((t) => t.stars === 4) ?? [],
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Review Templates</h1>

      {[5, 4].map((star) => (
        <div key={star} className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">
            {'⭐'.repeat(star)} {star}-Star Templates
          </h2>
          <div className="space-y-3">
            {grouped[star as keyof typeof grouped].map((t) => (
              <div key={t.id} className="bg-white rounded-lg p-4 border border-slate-200">
                <p className="text-slate-700">{t.template}</p>
                <div className="flex gap-2 mt-3">
                  {!t.is_active && <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded">Disabled</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
