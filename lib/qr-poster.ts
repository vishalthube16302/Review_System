/**
 * Builds a printable "Scan to Review" poster as a PNG data URL, combining:
 *  - a colourful Google-style wordmark (so it's obviously a Google Review
 *    prompt, not just a random QR code)
 *  - a 5-star row
 *  - the QR code itself
 *  - the business name
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

export async function generateQRPoster({
  qrDataUrl,
  businessName,
  brandColor = '4F46E5',
}: PosterOptions): Promise<string> {
  const width = 600
  const height = 900
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')

  const brand = `#${brandColor}`

  // Background gradient using the business's brand color.
  const bgGradient = ctx.createLinearGradient(0, 0, 0, height)
  bgGradient.addColorStop(0, brand)
  bgGradient.addColorStop(1, shadeColor(brand, -25))
  ctx.fillStyle = bgGradient
  ctx.fillRect(0, 0, width, height)

  // White card in the middle.
  const cardX = 40
  const cardY = 210
  const cardW = width - 80
  const cardH = 560
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.25)'
  ctx.shadowBlur = 30
  ctx.shadowOffsetY = 10
  ctx.fillStyle = '#ffffff'
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 28)
  ctx.fill()
  ctx.restore()

  // "Scan to leave us a" heading, white, on the colored background.
  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'
  ctx.font = '600 30px Arial, sans-serif'
  ctx.fillText('Scan to leave us a', width / 2, 70)

  // Colourful "Google" wordmark.
  const word = 'Google'
  ctx.font = '700 56px Arial, sans-serif'
  const letterWidths = word.split('').map((ch) => ctx.measureText(ch).width)
  const totalWidth = letterWidths.reduce((a, b) => a + b, 0)
  let cursorX = width / 2 - totalWidth / 2
  const wordY = 130
  word.split('').forEach((ch, i) => {
    ctx.fillStyle = GOOGLE_COLORS[i % GOOGLE_COLORS.length]
    ctx.textAlign = 'left'
    ctx.fillText(ch, cursorX, wordY)
    cursorX += letterWidths[i]
  })
  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'
  ctx.font = '600 30px Arial, sans-serif'
  ctx.fillText('Review', width / 2, 180)

  // 5-star row, centered inside the white card, above the QR code.
  const starY = cardY + 60
  const starSpacing = 44
  const starsStartX = width / 2 - starSpacing * 2
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, starsStartX + i * starSpacing, starY, 18)
  }

  // QR code image, centered in the card.
  const qrImg = await loadImage(qrDataUrl)
  const qrSize = 340
  const qrX = width / 2 - qrSize / 2
  const qrY = starY + 40
  ctx.save()
  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = 2
  drawRoundedRect(ctx, qrX - 12, qrY - 12, qrSize + 24, qrSize + 24, 16)
  ctx.stroke()
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize)
  ctx.restore()

  // Business name below the QR code.
  ctx.fillStyle = '#0f172a'
  ctx.font = '700 26px Arial, sans-serif'
  ctx.textAlign = 'center'
  const nameY = qrY + qrSize + 50
  ctx.fillText(truncate(ctx, businessName, cardW - 60), width / 2, nameY)

  // Helper caption.
  ctx.fillStyle = '#64748b'
  ctx.font = '400 18px Arial, sans-serif'
  ctx.fillText('Open your camera and point at the code', width / 2, nameY + 34)

  // Footer branding.
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.font = '500 16px Arial, sans-serif'
  ctx.fillText('Powered by ReviewBoost', width / 2, height - 30)

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

function shadeColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const r = Math.min(255, Math.max(0, (num >> 16) + amt))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt))
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amt))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}
