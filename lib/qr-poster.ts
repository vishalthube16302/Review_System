/**
 * Builds a printable "Google Review" QR sticker as a PNG data URL:
 *  - a colourful "Google" wordmark at the top
 *  - a 5-star row underneath it
 *  - the QR code framed in the middle, in the business's brand color
 *  - the business name below
 *
 * Runs entirely in the browser via Canvas - no server round trip needed,
 * matching the existing client-side QR generation.
 */

interface PosterOptions {
  qrDataUrl: string
  businessName: string
  brandColor?: string // hex without '#', e.g. '4F46E5'
}

const GOOGLE_COLORS = ['#4285F4', '#EA4335', '#FBBC05', '#4285F4', '#34A853', '#EA4335']

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath()
  for (let i = 0; i < 5; i++) {
    const outerAngle = (Math.PI / 2) * -1 + (i * 4 * Math.PI) / 5
    const x = cx + r * Math.cos(outerAngle)
    const y = cy + r * Math.sin(outerAngle)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = '#FBBC05'
  ctx.fill()
}

function drawGoogleWordmark(ctx: CanvasRenderingContext2D, centerX: number, y: number) {
  const word = 'Google'
  ctx.font = '700 54px Arial, sans-serif'
  const letterWidths = word.split('').map((ch) => ctx.measureText(ch).width)
  const totalWidth = letterWidths.reduce((a, b) => a + b, 0)
  let cursorX = centerX - totalWidth / 2
  ctx.textAlign = 'left'
  word.split('').forEach((ch, i) => {
    ctx.fillStyle = GOOGLE_COLORS[i % GOOGLE_COLORS.length]
    ctx.fillText(ch, cursorX, y)
    cursorX += letterWidths[i]
  })
  ctx.textAlign = 'center'
}

export async function generateQRPoster({
  qrDataUrl,
  businessName,
  brandColor = '4F46E5',
}: PosterOptions): Promise<string> {
  const width = 600
  const height = 850
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')

  const brand = `#${brandColor}`

  // Soft light background so the colourful wordmark and gold stars pop,
  // sticker-style, with a thin brand-color border.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.strokeStyle = brand
  ctx.lineWidth = 10
  drawRoundedRect(ctx, 5, 5, width - 10, height - 10, 32)
  ctx.stroke()

  // Brand-color header band.
  ctx.save()
  drawRoundedRect(ctx, 5, 5, width - 10, 130, 32)
  ctx.clip()
  ctx.fillStyle = brand
  ctx.fillRect(5, 5, width - 10, 130)
  ctx.restore()

  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'
  ctx.font = '600 24px Arial, sans-serif'
  ctx.fillText('SCAN TO LEAVE US A REVIEW ON', width / 2, 90)

  // Colourful Google wordmark, just below the header band.
  drawGoogleWordmark(ctx, width / 2, 220)

  // 5-star row underneath the wordmark.
  const starY = 270
  const starSpacing = 46
  const starsStartX = width / 2 - starSpacing * 2
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, starsStartX + i * starSpacing, starY, 19)
  }

  // QR code, framed in the brand color, centered.
  const qrImg = await loadImage(qrDataUrl)
  const qrSize = 340
  const qrX = width / 2 - qrSize / 2
  const qrY = starY + 50
  ctx.save()
  ctx.strokeStyle = brand
  ctx.lineWidth = 6
  drawRoundedRect(ctx, qrX - 16, qrY - 16, qrSize + 32, qrSize + 32, 20)
  ctx.stroke()
  ctx.fillStyle = '#ffffff'
  drawRoundedRect(ctx, qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 16)
  ctx.fill()
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize)
  ctx.restore()

  // Business name below the QR code.
  ctx.fillStyle = '#0f172a'
  ctx.font = '700 28px Arial, sans-serif'
  const nameY = qrY + qrSize + 55
  ctx.fillText(truncate(ctx, businessName, width - 80), width / 2, nameY)

  // Helper caption.
  ctx.fillStyle = '#64748b'
  ctx.font = '400 18px Arial, sans-serif'
  ctx.fillText('Open your camera and point at the code', width / 2, nameY + 32)

  // Footer branding.
  ctx.fillStyle = '#94a3b8'
  ctx.font = '500 14px Arial, sans-serif'
  ctx.fillText('Powered by ReviewBoost', width / 2, height - 25)

  return canvas.toDataURL('image/png')
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let result = text
  while (ctx.measureText(result + '…').width > maxWidth && result.length > 0) {
    result = result.slice(0, -1)
  }
  return result + '…'
}
