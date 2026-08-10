import QRCode from 'qrcode'

export async function generateQRCode(slug: string): Promise<string> {
  const url = `${process.env.NEXT_PUBLIC_BASE_URL}/${slug}`
  const dataUrl = await QRCode.toDataURL(url, {
    width: 400,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  })
  return dataUrl
}

// Encodes Google's own "write a review" URL directly - scanning this skips
// our review page and AI entirely, going straight to Google. High error
// correction ('H') is required here too, since the QR poster overlays a
// small logo on top of the code.
export async function generateDirectGoogleQRCode(googlePlaceId: string): Promise<string> {
  const url = `https://search.google.com/local/writereview?placeid=${googlePlaceId}`
  const dataUrl = await QRCode.toDataURL(url, {
    width: 400,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  })
  return dataUrl
}

export function getReviewUrl(slug: string): string {
  return `${process.env.NEXT_PUBLIC_BASE_URL}/${slug}`
}

export function getDirectGoogleReviewUrl(googlePlaceId: string): string {
  return `https://search.google.com/local/writereview?placeid=${googlePlaceId}`
}
