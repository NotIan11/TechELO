import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Mono, Inter, Inter_Tight } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-body' })
const interTight = Inter_Tight({ subsets: ['latin'], variable: '--font-display' })
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: {
    default: 'Tech ELO · Caltech house games',
    template: '%s · Tech ELO',
  },
  description:
    'Pool and ping pong ratings, a poker ledger. Confirmed by the people you played.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Tech ELO',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0b0b0c',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${interTight.variable} ${plexMono.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  )
}
