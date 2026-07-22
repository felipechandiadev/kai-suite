import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { appFontClassName } from "@/shared/fonts/app-fonts";

const THEME_COLOR = "#1e73ae";
const APP_TITLE = "KaiFood | Mesero";

export const metadata: Metadata = {
  applicationName: "KaiFood Mesero",
  title: { default: APP_TITLE, template: "%s | KaiFood Mesero" },
  description: "App de mesero para salón KaiFood",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "KaiFood Mesero",
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    apple: [{ url: "/logo.png" }],
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
    <html lang="es-CL">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="KaiFood | Mesero" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${appFontClassName} min-h-screen bg-background text-foreground`}>
        {children}
        <Script id="waiter-sw-register" strategy="afterInteractive">
          {`if ('serviceWorker' in navigator && ${registerServiceWorker}) {
  navigator.serviceWorker.register('/sw.js');
}`}
        </Script>
      </body>
    </html>
  );
}
