import localFont from "next/font/local";

/**
 * Inter — fuente base de Delivery (variable, autohospedada vía next/font/local).
 * Mismo patrón que kai-admin / kai-eshop.
 */
export const inter = localFont({
  src: "../../assets/fonts/inter-variable.ttf",
  weight: "100 900",
  style: "normal",
  variable: "--font-inter",
  display: "swap",
  preload: true,
  fallback: [
    "ui-sans-serif",
    "system-ui",
    "-apple-system",
    "Segoe UI",
    "Roboto",
    "Helvetica Neue",
    "Arial",
    "Noto Sans",
    "sans-serif",
  ],
});

/** Variables CSS + Inter como fuente base heredada en `<body>`. */
export const deliveryFontClassName = `${inter.variable} ${inter.className}`;
