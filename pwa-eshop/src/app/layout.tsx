import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { eshopFontClassName } from "@/shared/fonts/eshop-fonts";
import "./globals.css";

const THEME_COLOR = "#002B59";
const APP_TITLE = "KaiStore eShop";

const siteUrl = process.env.NEXT_PUBLIC_ESHOP_SITE_URL?.trim();

export const metadata: Metadata = {
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  applicationName: APP_TITLE,
  title: { default: APP_TITLE, template: "%s | KaiStore eShop" },
  description: "Tienda en línea KaiStore",
  appleWebApp: {
    capable: true,
    title: APP_TITLE,
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

/** Producción o `NEXT_PUBLIC_SW_DEV=1` en desarrollo. */
const registerServiceWorker =
  process.env.NODE_ENV === "production" ||
  process.env.NEXT_PUBLIC_SW_DEV === "1";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CL" className={`h-full antialiased ${eshopFontClassName}`}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={APP_TITLE} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <Script id="kaistore-eshop-register-sw" strategy="afterInteractive">
          {`if ('serviceWorker' in navigator && ${registerServiceWorker}) {
  navigator.serviceWorker.register('/sw.js');
}`}
        </Script>
      </body>
    </html>
  );
}
