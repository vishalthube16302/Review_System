/**
 * Two distinct printable poster types:
 *
 *  - generateQRPoster: the AI-powered flow. Scanning it lands on our own
 *    review page, where AI drafts a short review for the customer to copy
 *    and post. Shows the business's own logo + name at the top, a
 *    "We value your feedback" banner - built to look good standing on a counter, not just functional.
 *
 *  - generateDirectGooglePoster: no AI, no middle page. The QR encodes
 *    Google's own "write a review" link directly, so scanning it opens
 *    Google immediately. Visually distinct on purpose (blue/white, Google
 *    logo front and center) so nobody mixes up which stand is which.
 *
 * Both run entirely in the browser via Canvas.
 */

interface PosterOptions {
  qrDataUrl: string
  businessName: string
  brandColor?: string // hex without '#', e.g. '4F46E5'
  logoUrl?: string | null
}

const GOOGLE_COLORS = ['#4285F4', '#EA4335', '#FBBC05', '#4285F4', '#34A853', '#EA4335']
const HEADING_FONT = 'Poppins'
const SCRIPT_FONT = 'Playfair Display'

// Loads the two web fonts used across both posters (a clean geometric sans
// for headings/labels, an elegant serif italic for the banner lines) once
// per page load, so posters look designed rather than default-Arial. Canvas
// text only picks up a font once the browser has actually loaded it, so we
// inject the stylesheet and explicitly wait via document.fonts.load() for
// every weight/size combination used below before any drawing happens.
let fontsReady: Promise<void> | null = null

function ensureFonts(): Promise<void> {
  if (fontsReady) return fontsReady
  fontsReady = (async () => {
    if (typeof document === 'undefined') return
    if (!document.querySelector('link[data-qr-poster-fonts]')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href =
        'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@1,600;1,700&display=swap'
      link.setAttribute('data-qr-poster-fonts', 'true')
      document.head.appendChild(link)
    }
    try {
      await Promise.all([
        document.fonts.load(`800 30px "${HEADING_FONT}"`),
        document.fonts.load(`700 30px "${HEADING_FONT}"`),
        document.fonts.load(`600 20px "${HEADING_FONT}"`),
        document.fonts.load(`500 14px "${HEADING_FONT}"`),
        document.fonts.load(`400 16px "${HEADING_FONT}"`),
        document.fonts.load(`italic 700 30px "${SCRIPT_FONT}"`),
        document.fonts.load(`italic 600 19px "${SCRIPT_FONT}"`),
      ])
    } catch {
      // If the fonts fail to load (offline, network blocked), canvas falls
      // back to the default sans-serif gracefully - plainer, not broken.
    }
  })()
  return fontsReady
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
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
  ctx.fillStyle = '#F5A623'
  ctx.fill()
}

function drawGoogleWordmark(ctx: CanvasRenderingContext2D, centerX: number, y: number, fontSize = 54) {
  const word = 'Google'
  ctx.font = `700 ${fontSize}px "${HEADING_FONT}", Arial, sans-serif`
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

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let result = text
  while (ctx.measureText(result + '…').width > maxWidth && result.length > 0) {
    result = result.slice(0, -1)
  }
  return result + '…'
}

// Draws the QR code with a small circular logo watermark centered on top.
// Safe because both QR generators use errorCorrectionLevel 'H', which
// tolerates roughly 30% obstruction - a small centered logo is well within
// that margin.
async function drawQRWithWatermark(
  ctx: CanvasRenderingContext2D,
  qrDataUrl: string,
  x: number,
  y: number,
  size: number,
  logoUrl?: string | null
) {
  const qrImg = await loadImage(qrDataUrl)
  ctx.drawImage(qrImg, x, y, size, size)

  if (!logoUrl) return
  try {
    const logo = await loadImage(logoUrl)
    const badge = size * 0.22
    const cx = x + size / 2
    const cy = y + size / 2
    ctx.save()
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(cx, cy, badge / 2 + 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(cx, cy, badge / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(logo, cx - badge / 2, cy - badge / 2, badge, badge)
    ctx.restore()
  } catch {
    // Logo failed to load (broken URL, offline) - QR code alone still works.
  }
}

/**
 * AI-powered "Scan to Review" poster: business branding at the top, a
 * feedback banner, Google + stars, the QR code (watermarked with the
 * business's own logo if they have one), and a thank-you footer banner.
 */
export async function generateQRPoster({
  qrDataUrl,
  businessName,
  brandColor = '4F46E5',
  logoUrl,
}: PosterOptions): Promise<string> {
  await ensureFonts()

  const width = 640
  const height = 1140
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')
  const brand = `#${brandColor}`

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.textAlign = 'center'

  let y = 0

  // Top decorative band.
  ctx.fillStyle = brand
  ctx.fillRect(0, 0, width, 64)
  ctx.beginPath()
  ctx.ellipse(width / 2, 64, width * 0.55, 30, 0, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  y = 96

  // Business logo, if they have one.
  if (logoUrl) {
    try {
      const logo = await loadImage(logoUrl)
      const logoSize = 100
      ctx.save()
      drawRoundedRect(ctx, width / 2 - logoSize / 2, y, logoSize, logoSize, 16)
      ctx.clip()
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(width / 2 - logoSize / 2, y, logoSize, logoSize)
      ctx.drawImage(logo, width / 2 - logoSize / 2, y, logoSize, logoSize)
      ctx.restore()
      y += logoSize + 46
    } catch {
      // Skip the logo slot entirely if it fails to load.
      y += 30
    }
  } else {
    y += 30
  }

  // Business name.
  ctx.fillStyle = '#0f172a'
  ctx.font = `700 30px "${HEADING_FONT}", Arial, sans-serif`
  ctx.fillText(truncate(ctx, businessName, width - 80), width / 2, y)
  y += 52

  // "We value your feedback" banner.
  const bannerH = 130
  ctx.fillStyle = brand
  drawRoundedRect(ctx, 40, y, width - 80, bannerH, 24)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = `italic 700 30px "${SCRIPT_FONT}", Georgia, serif`
  ctx.fillText('We Value Your Feedback!', width / 2, y + 54)
  ctx.font = `400 17px "${HEADING_FONT}", Arial, sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.fillText('Your review helps us serve you better.', width / 2, y + 92)
  y += bannerH + 46

  // "Scan to leave us a review on Google" + stars.
  ctx.fillStyle = '#0f172a'
  ctx.font = `600 19px "${HEADING_FONT}", Arial, sans-serif`
  ctx.fillText('SCAN TO LEAVE US A REVIEW ON', width / 2, y)
  y += 56
  drawGoogleWordmark(ctx, width / 2, y, 50)
  y += 46
  const starSpacing = 42
  const starsStartX = width / 2 - starSpacing * 2
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, starsStartX + i * starSpacing, y, 17)
  }
  y += 56

  // QR code, framed, with the business's logo watermarked in the center.
  const qrSize = 300
  const qrX = width / 2 - qrSize / 2
  ctx.save()
  ctx.strokeStyle = brand
  ctx.lineWidth = 5
  drawRoundedRect(ctx, qrX - 14, y - 14, qrSize + 28, qrSize + 28, 18)
  ctx.stroke()
  ctx.restore()
  await drawQRWithWatermark(ctx, qrDataUrl, qrX, y, qrSize, logoUrl)
  y += qrSize + 56

  // Small platform branding, sitting in the white space above the footer
  // banner - subtle on purpose, this poster is about the business, not us.
  ctx.fillStyle = '#cbd5e1'
  ctx.font = `500 12px "${HEADING_FONT}", Arial, sans-serif`
  ctx.fillText('Powered by Review Booster', width / 2, y)

  // Bottom thank-you banner.
  const footerH = 90
  ctx.fillStyle = brand
  ctx.beginPath()
  ctx.ellipse(width / 2, height - footerH, width * 0.55, 30, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillRect(0, height - footerH, width, footerH)
  ctx.fillStyle = '#ffffff'
  ctx.font = `italic 600 19px "${SCRIPT_FONT}", Georgia, serif`
  ctx.fillText('Thank you for being', width / 2, height - 54)
  ctx.fillText('a part of our journey!', width / 2, height - 26)

  return canvas.toDataURL('image/png')
}

/**
 * Direct-to-Google poster: no AI, no middle page - the QR encodes Google's
 * review URL directly. Deliberately simpler and Google-blue instead of the
 * business's brand color, so it's visually obvious this is a different
 * stand from the AI-powered one.
 *
 * Height is computed from the same fixed layout constants used to draw the
 * content (not a guessed fixed number), so the footer always sits close to
 * the QR code instead of floating in empty space below it.
 */
export async function generateDirectGooglePoster({
  qrDataUrl,
  businessName,
  logoUrl,
}: PosterOptions): Promise<string> {
  await ensureFonts()

  const width = 640
  const topMargin = 100
  const logoBlockH = logoUrl ? 42 : 0 // extra offset the logo adds before content starts - text sits on its baseline, so this needs to clear the font's ascent, not just look like a gap in the numbers
  const nameH = 70
  const scanTextH = 66
  const googleH = 50
  const starsH = 60
  const qrSize = 330
  const qrBlockH = qrSize + 46
  const captionH = 50
  const footerH = 70
  const bottomPadding = 30

  const height =
    topMargin +
    logoBlockH +
    nameH +
    scanTextH +
    googleH +
    starsH +
    qrBlockH +
    captionH +
    footerH +
    bottomPadding

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.strokeStyle = '#4285F4'
  ctx.lineWidth = 8
  drawRoundedRect(ctx, 4, 4, width - 8, height - 8, 28)
  ctx.stroke()
  ctx.textAlign = 'center'

  let y = topMargin

  if (logoUrl) {
    try {
      const logo = await loadImage(logoUrl)
      const logoSize = 84
      ctx.save()
      drawRoundedRect(ctx, width / 2 - logoSize / 2, y - logoSize, logoSize, logoSize, 14)
      ctx.clip()
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(width / 2 - logoSize / 2, y - logoSize, logoSize, logoSize)
      ctx.drawImage(logo, width / 2 - logoSize / 2, y - logoSize, logoSize, logoSize)
      ctx.restore()
      y += logoBlockH
    } catch {
      // Skip if it fails to load - the reserved logoBlockH space still
      // applies so layout math above stays accurate either way.
      y += logoBlockH
    }
  }

  ctx.fillStyle = '#0f172a'
  ctx.font = `700 26px "${HEADING_FONT}", Arial, sans-serif`
  ctx.fillText(truncate(ctx, businessName, width - 80), width / 2, y)
  y += nameH

  ctx.font = `600 22px "${HEADING_FONT}", Arial, sans-serif`
  ctx.fillStyle = '#475569'
  ctx.fillText('Scan to leave us a review on', width / 2, y)
  y += scanTextH
  drawGoogleWordmark(ctx, width / 2, y, 60)
  y += googleH

  const starSpacing = 44
  const starsStartX = width / 2 - starSpacing * 2
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, starsStartX + i * starSpacing, y, 18)
  }
  y += starsH

  const qrX = width / 2 - qrSize / 2
  ctx.save()
  ctx.strokeStyle = '#4285F4'
  ctx.lineWidth = 5
  drawRoundedRect(ctx, qrX - 14, y - 14, qrSize + 28, qrSize + 28, 18)
  ctx.stroke()
  ctx.restore()
  await drawQRWithWatermark(ctx, qrDataUrl, qrX, y, qrSize, logoUrl)
  y += qrBlockH

  ctx.fillStyle = '#64748b'
  ctx.font = `400 16px "${HEADING_FONT}", Arial, sans-serif`
  ctx.fillText('Opens Google Reviews instantly - no extra steps', width / 2, y)
  y += captionH

  ctx.fillStyle = '#94a3b8'
  ctx.font = `500 14px "${HEADING_FONT}", Arial, sans-serif`
  ctx.fillText('Powered by Google', width / 2, y)
  y += 22
  ctx.fillStyle = '#cbd5e1'
  ctx.font = `500 12px "${HEADING_FONT}", Arial, sans-serif`
  ctx.fillText('via Review Booster', width / 2, y)

  return canvas.toDataURL('image/png')
}
