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

export function getReviewUrl(slug: string): string {
  return `${process.env.NEXT_PUBLIC_BASE_URL}/${slug}`
}
