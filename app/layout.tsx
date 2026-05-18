import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ReviewBoost — Google Review Automation',
  description: 'Collect Google reviews effortlessly via QR codes',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
