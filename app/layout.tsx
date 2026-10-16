import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ServiceWorker } from '@/components/ServiceWorker'

export const metadata: Metadata = {
  title: { default: 'homedocs', template: '%s · homedocs' },
  applicationName: 'homedocs',
  appleWebApp: { capable: true, title: 'homedocs', statusBarStyle: 'default' },
  // Private family data: nothing here belongs in a search engine.
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f5f2' },
    { media: '(prefers-color-scheme: dark)', color: '#141412' },
  ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
        <ServiceWorker />
      </body>
    </html>
  )
}
