import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { deliveryFontClassName } from "@/shared/fonts/delivery-fonts";

const THEME_COLOR = "#002B59";
const APP_TITLE = "KaiStore | Delivery";

export const metadata: Metadata = {
  applicationName: "KaiStore Delivery",
  title: { default: APP_TITLE, template: "%s | KaiStore Delivery" },
  description: "App de reparto para repartidores KaiStore (PWA)",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "KaiStore Delivery",
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
  themeColor: THEME_COLOR,
};

/** Solo en build/SSR; no usar `process` dentro del string del `<script>` (en el browser no existe). */
const registerServiceWorkerInProduction = process.env.NODE_ENV === "production";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CL">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="KaiStore Delivery" />
      </head>
      <body className={`${deliveryFontClassName} min-h-screen bg-background text-foreground`}>
        {children}
        <Script id="sw-register" strategy="afterInteractive">
          {`if ('serviceWorker' in navigator && ${registerServiceWorkerInProduction}) {
  navigator.serviceWorker.register('/sw.js');
}`}
        </Script>
      </body>
    </html>
  );
}
