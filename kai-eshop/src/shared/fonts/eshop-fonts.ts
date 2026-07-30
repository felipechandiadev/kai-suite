import localFont from "next/font/local";

/**
 * Inter — cuerpo de texto (variable, autohospedada vía next/font).
 * Un solo archivo (~854 KB) sustituye decenas de estáticos; next optimiza y cachea en build.
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
    "sans-serif",
  ],
});

/**
 * League Spartan — titulares y hero (variable, ~92 KB).
 * Sin preload: el cuerpo (Inter) es crítico para LCP; los títulos cargan en el primer paint siguiente.
 */
export const leagueSpartan = localFont({
  src: "../../assets/fonts/league-spartan-variable.ttf",
  weight: "100 900",
  style: "normal",
  variable: "--font-display",
  display: "swap",
  preload: false,
  fallback: [
    "ui-sans-serif",
    "system-ui",
    "-apple-system",
    "Segoe UI",
    "Roboto",
    "Helvetica Neue",
    "Arial",
    "sans-serif",
  ],
});

/** Clases para `<html>`: variables CSS + Inter como fuente base heredada. */
export const eshopFontClassName = `${inter.variable} ${leagueSpartan.variable} ${inter.className}`;
