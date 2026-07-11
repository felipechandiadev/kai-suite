import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthProvider from '@/providers/AuthProvider';
import ErrorHandlerProvider from '@/providers/ErrorHandlerProvider';
import AdminAmbientBackground from '@/shared/components/AdminAmbientBackground/AdminAmbientBackground';

const THEME_COLOR = "#002B59";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_TITLE = "KaiStore | Administración";

export const metadata: Metadata = {
  applicationName: APP_TITLE,
  title: {
    default: APP_TITLE,
    template: APP_TITLE,
  },
  description: "Panel de administración KaiStore",
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

/** Solo en build/SSR; no usar `process` dentro del string del `<script>` (en el browser no existe). */
const registerServiceWorkerInProduction = process.env.NODE_ENV === "production";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-CL">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={APP_TITLE} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-full flex flex-col`}>
        <div className="kai-admin-app-shell flex min-h-dvh flex-1 flex-col">
          <AdminAmbientBackground />
          <div className="relative z-10 flex min-h-dvh flex-1 flex-col">
            <AuthProvider>
              <ErrorHandlerProvider>
                {children}
              </ErrorHandlerProvider>
            </AuthProvider>
          </div>
        </div>
        <Script id="flowstore-register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator && ${registerServiceWorkerInProduction}) {
              navigator.serviceWorker.register('/sw.js');
            }
          `}
        </Script>
      </body>
    </html>
  );
}
