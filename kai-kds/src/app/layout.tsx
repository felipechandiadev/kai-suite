import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { appFontClassName } from "@/shared/fonts/app-fonts";
import KdsAmbientBackground from "@/shared/components/KdsAmbientBackground/KdsAmbientBackground";

const THEME_COLOR = "#1e73ae";
const APP_TITLE = "KaiFood | KDS";

export const metadata: Metadata = {
  applicationName: "KaiFood KDS",
  title: { default: APP_TITLE, template: "%s | KaiFood KDS" },
  description: "Kitchen Display System KaiFood",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: THEME_COLOR,
};

const registerServiceWorker =
  process.env.NODE_ENV === "production" ||
  process.env.NEXT_PUBLIC_SW_DEV === "1";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CL">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="KaiFood | KDS" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${appFontClassName} min-h-screen text-foreground`}>
        <div className="kai-kds-app-shell flex min-h-dvh flex-col">
          <KdsAmbientBackground />
          <div className="relative z-10 flex min-h-dvh flex-1 flex-col">
            {children}
          </div>
        </div>
        <Script id="kds-sw-register" strategy="afterInteractive">
          {`if ('serviceWorker' in navigator && ${registerServiceWorker}) {
  navigator.serviceWorker.register('/sw.js');
}`}
        </Script>
      </body>
    </html>
  );
}
