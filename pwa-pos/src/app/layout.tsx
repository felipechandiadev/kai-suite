import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import AuthProvider from "@/providers/AuthProvider";

/** Sin `next/font/google`: el build no debe hacer fetch a Google Fonts (CI/sin red). Ver `:root` en `globals.css`. */

const THEME_COLOR = "#002B59";

export const metadata: Metadata = {
  title: {
    default: "KaiStore | POS",
    template: "%s | KaiStore POS",
  },
  description: "Punto de venta KaiStore (PWA)",
  manifest: "/manifest.json",
  applicationName: "KaiStore POS",
  appleWebApp: {
    capable: true,
    title: "KaiStore | POS",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    "msapplication-TileColor": THEME_COLOR,
    "msapplication-config": "/browserconfig.xml",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: THEME_COLOR,
};

/** Solo en build/SSR; no usar `process` dentro del string del `<script>` (en el browser no existe). */
const registerServiceWorkerInProduction = process.env.NODE_ENV === "production";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-CL" className="h-full antialiased">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="KaiStore | POS" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AuthProvider>{children}</AuthProvider>
        <Script id="sw-register" strategy="afterInteractive">
          {`if ('serviceWorker' in navigator && ${registerServiceWorkerInProduction}) {
  navigator.serviceWorker.register('/sw.js');
}`}
        </Script>
      </body>
    </html>
  );
}
