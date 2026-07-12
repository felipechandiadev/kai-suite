import localFont from 'next/font/local';

/**
 * Inter — fuente base del admin (variable, autohospedada vía next/font/local).
 * Mismo patrón que pwa-eshop/src/shared/fonts/eshop-fonts.ts.
 */
export const inter = localFont({
  src: '../../assets/fonts/inter-variable.ttf',
  weight: '100 900',
  style: 'normal',
  variable: '--font-inter',
  display: 'swap',
  preload: true,
  fallback: [
    'ui-sans-serif',
    'system-ui',
    '-apple-system',
    'Segoe UI',
    'Roboto',
    'Helvetica Neue',
    'Arial',
    'Noto Sans',
    'sans-serif',
  ],
});

/** Variables CSS + Inter como fuente base heredada en `<body>`. */
export const adminFontClassName = `${inter.variable} ${inter.className}`;
