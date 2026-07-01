import type { Metadata, Viewport } from 'next';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';
import './globals.css';

export const metadata: Metadata = {
  title: 'UFC Fantasy',
  description: 'UFC Fantasy League Manager',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'UFC Fantasy',
  },
  formatDetection: { telephone: false },
  icons: {
    apple: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        {/* iOS PWA: prevent overscroll rubber-banding at the root */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#030303" />
      </head>
      <body suppressHydrationWarning className="h-full w-full overflow-hidden bg-[#030303] text-zinc-100 antialiased selection:bg-zinc-800">
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
