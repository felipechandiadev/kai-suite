import type { Metadata, Viewport } from "next";
import "./globals.css";
import { appFontClassName } from "@/shared/fonts/app-fonts";
import KdsAmbientBackground from "@/shared/components/KdsAmbientBackground/KdsAmbientBackground";

const THEME_COLOR = "#1e73ae";
const APP_TITLE = "KaiFood | KDS";

export const metadata: Metadata = {
  applicationName: "KaiFood KDS",
  title: { default: APP_TITLE, template: "%s | KaiFood KDS" },
  description: "Kitchen Display System KaiFood",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: THEME_COLOR,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CL">
      <body className={`${appFontClassName} min-h-screen text-foreground`}>
        <div className="kai-kds-app-shell flex min-h-dvh flex-col">
          <KdsAmbientBackground />
          <div className="relative z-10 flex min-h-dvh flex-1 flex-col">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
