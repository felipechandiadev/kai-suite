import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Kai Courier",
  title: { default: "Kai Courier", template: "%s | Kai Courier" },
  description: "App de reparto para repartidores Kai",
  appleWebApp: { capable: true, title: "Kai Courier", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f766e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CL">
      <body className="min-h-screen bg-background text-foreground">{children}</body>
    </html>
  );
}
