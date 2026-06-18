import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Fantasy UFC",
  description: "Season-long UFC fighter fantasy",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Fantasy UFC" },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
          }
        `}} />
      </head>
      <body style={{ background: "var(--bg)" }}>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "var(--surface-2)",
              border: "1px solid var(--border-2)",
              color: "var(--text)",
              borderRadius: 12,
            },
          }}
        />
      </body>
    </html>
  );
}
