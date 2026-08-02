import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import AuthProvider from "@/providers/AuthProvider";
import { getKaiProductLabel } from "@/config/product-brand.config";

const THEME_COLOR = "#002B59";
const PRODUCT_LABEL = getKaiProductLabel(process.env.NEXT_PUBLIC_KAI_PRODUCT);
const APP_TITLE = `${PRODUCT_LABEL} | StockControl`;

export const metadata: Metadata = {
  title: {
    default: APP_TITLE,
    template: APP_TITLE,
  },
  description: `Inventario móvil ${PRODUCT_LABEL} (PWA)`,
  manifest: "/manifest.json",
  applicationName: `${PRODUCT_LABEL} StockControl`,
  appleWebApp: {
    capable: true,
    title: `${PRODUCT_LABEL} StockControl`,
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
    <html lang="es-CL" className="h-full antialiased">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content={`${PRODUCT_LABEL} StockControl`} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AuthProvider>{children}</AuthProvider>
        <Script id="sw-register" strategy="afterInteractive">
          {`if ('serviceWorker' in navigator && ${registerServiceWorker}) {
  navigator.serviceWorker.register('/sw.js');
}`}
        </Script>
      </body>
    </html>
  );
}
