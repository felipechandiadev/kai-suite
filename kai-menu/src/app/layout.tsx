import type { Metadata, Viewport } from "next";
import "./globals.css";

const THEME_COLOR = "#c2410c";

export const metadata: Metadata = {
  applicationName: "KaiFood Menú",
  title: { default: "KaiFood | Menú", template: "%s | KaiFood Menú" },
  description: "Carta digital del restaurante",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: THEME_COLOR,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CL">
      <body className="min-h-screen bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
