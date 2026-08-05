import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireSuperAdmin } from '@/lib/auth-guard'

const MAX_SIZE = 2 * 1024 * 1024 // 2MB, matches the bucket's file_size_limit
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']

// Uploads a business logo to the public 'logos' storage bucket and returns
// its public URL, ready to save as business_pages.logo_url. Runs on the
// admin panel only - restaurant owners don't currently have a way to change
// their own logo after signup.
export async function POST(request: Request) {
  const { error: authError } = await requireSuperAdmin()
  if (authError) return authError

  const formData = await request.formData()
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Logo must be a PNG, JPEG, WEBP, or SVG image.' },
      { status: 400 }
    )
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Logo must be under 2MB.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const ext = file.name.split('.').pop() || 'png'
  const path = `${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('logos')
    .upload(path, file, { contentType: file.type, upsert: false })

  if (uploadError) {
    console.error('Error uploading logo:', uploadError)
    return NextResponse.json({ error: 'Failed to upload logo.' }, { status: 500 })
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('logos').getPublicUrl(path)

  return NextResponse.json({ logo_url: publicUrl })
}
