import type { Metadata, Viewport } from "next";
import "./globals.css";
import { appFontClassName } from "@/shared/fonts/app-fonts";

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
      <body className={`${appFontClassName} min-h-screen bg-background text-foreground`}>
        {children}
      </body>
    </html>
  );
}
