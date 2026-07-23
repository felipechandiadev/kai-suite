import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { appFontClassName } from "@/shared/fonts/app-fonts";
import BoardAmbientBackground from "@/shared/components/BoardAmbientBackground/BoardAmbientBackground";

const THEME_COLOR = "#070b12";
const APP_TITLE = "Kai Board";

export const metadata: Metadata = {
  applicationName: "Kai Board",
  title: { default: APP_TITLE, template: "%s | Kai Board" },
  description: "Monitor de estado de pedidos KaiFood",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: THEME_COLOR,
  colorScheme: "dark",
};

const registerServiceWorker =
  process.env.NODE_ENV === "production" ||
  process.env.NEXT_PUBLIC_SW_DEV === "1";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CL" className="dark" style={{ colorScheme: "dark" }}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Kai Board" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${appFontClassName} min-h-screen bg-background text-foreground`}>
        <div className="kai-board-app-shell flex min-h-dvh flex-col">
          <BoardAmbientBackground />
          <div className="relative z-10 flex min-h-dvh flex-1 flex-col">
            {children}
          </div>
        </div>
        <Script id="board-sw-register" strategy="afterInteractive">
          {`if ('serviceWorker' in navigator && ${registerServiceWorker}) {
  navigator.serviceWorker.register('/sw.js');
}`}
        </Script>
      </body>
    </html>
  );
}
