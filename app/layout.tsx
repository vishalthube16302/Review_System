import type { Metadata } from 'next'
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'Review Booster — Google Review Automation',
  description: 'Collect Google reviews effortlessly via QR codes',
  icons: {
    icon: '/favicon-32.png',
    apple: '/favicon-180.png',
  },
  openGraph: {
    title: 'Review Booster',
    description: 'Collect Google reviews effortlessly via QR codes',
    images: ['/logo-full.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
