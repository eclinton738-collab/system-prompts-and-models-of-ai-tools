import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/Providers'

export const metadata: Metadata = {
  title: 'ACL FORGE — Where African Combat Becomes Legend.',
  description: 'AI-powered cinematic documentary editor for the African Combat League',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-forge-bg text-forge-text antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
