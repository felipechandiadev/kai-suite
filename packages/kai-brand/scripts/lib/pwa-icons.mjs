import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

export async function squarePng(source, size, { background = WHITE } = {}) {
  return sharp(source)
    .resize(size, size, { fit: "contain", position: "center", background })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * Favicon de pestaña: recorta márgenes y escala ~6 % más que `contain` puro.
 */
export async function faviconPng(source, size) {
  const trimmed = await sharp(source).trim({ threshold: 12 }).png().toBuffer();
  const zoom = Math.round(size * 1.06);
  return sharp(trimmed)
    .resize(zoom, zoom, { fit: "cover", position: "centre" })
    .extract({
      left: Math.floor((zoom - size) / 2),
      top: Math.floor((zoom - size) / 2),
      width: size,
      height: size,
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** PWA maskable: icono al 80 % centrado sobre fondo blanco. */
export async function maskablePng(source, size) {
  const inner = Math.round(size * 0.8);
  const logo = await sharp(source)
    .resize(inner, inner, { fit: "contain", position: "center", background: TRANSPARENT })
    .png()
    .toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 4, background: WHITE },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * Genera el set estándar PWA en `outDir`.
 * Iconos `any` usan fondo transparente; maskable usa blanco (#FFFFFF).
 */
export async function generatePwaIconSet({
  outDir,
  faviconSource,
  appIconSource,
  androidIconSource,
}) {
  fs.mkdirSync(outDir, { recursive: true });
  const androidSrc = androidIconSource ?? appIconSource;
  const transparentBg = { background: TRANSPARENT };

  const writes = [
    ["favicon-16x16.png", faviconSource, 16, false],
    ["favicon-32x32.png", faviconSource, 32, false],
    ["apple-touch-icon.png", appIconSource, 180, false],
    ["android-chrome-192x192.png", androidSrc, 192, false],
    ["android-chrome-512x512.png", androidSrc, 512, false],
    ["android-chrome-192x192-maskable.png", androidSrc, 192, true],
    ["android-chrome-512x512-maskable.png", androidSrc, 512, true],
    ["logo-app.png", appIconSource, 1024, false],
    ["mstile-150x150.png", appIconSource, 150, false],
  ];

  for (const [name, src, size, maskable] of writes) {
    let buf;
    if (maskable) {
      buf = await maskablePng(src, size);
    } else if (name.startsWith("favicon-")) {
      buf = await faviconPng(src, size);
    } else {
      buf = await squarePng(src, size, transparentBg);
    }
    fs.writeFileSync(path.join(outDir, name), buf);
  }
}

export async function generateShortcutIcon(source, outFile, size = 192) {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const buf = await squarePng(source, size, { background: TRANSPARENT });
  fs.writeFileSync(outFile, buf);
}
