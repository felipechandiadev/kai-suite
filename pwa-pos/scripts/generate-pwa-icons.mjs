/**
 * Genera iconos PWA para Android / «Añadir a pantalla de inicio».
 *
 * Fuente maestra (prioridad):
 *   packages/kai-printers-brand/sources/kai-printers.png
 * Fallback: public/logo.png y public/fav.png
 *
 * Uso: npm run generate-pwa-icons
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const brandIcon = path.join(root, "..", "packages", "kai-printers-brand", "sources", "kai-printers.png");
const logoFallback = path.join(root, "public", "logo.png");
const favFallback = path.join(root, "public", "fav.png");
const logoSrc = fs.existsSync(brandIcon) ? brandIcon : logoFallback;
const favSrc = fs.existsSync(brandIcon) ? brandIcon : favFallback;
const publicDir = path.join(root, "public");
const iconsDir = path.join(publicDir, "icons");
const appDir = path.join(root, "src", "app");

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

async function rasterContain(source, size) {
  return sharp(source)
    .resize(size, size, {
      fit: "contain",
      position: "center",
      background: WHITE,
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** Favicon: arte cuadrado (fav.png); cover evita bandas blancas en tamaños chicos. */
async function rasterFavicon(source, size) {
  return sharp(source)
    .resize(size, size, { fit: "cover", position: "center" })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** Icono maskable: logo ~72% del lado, centrado sobre lienzo blanco (zona segura). */
async function rasterMaskable(source, size) {
  const inner = Math.round(size * 0.72);
  const padding = Math.floor((size - inner) / 2);
  const body = await sharp(source)
    .resize(inner, inner, {
      fit: "contain",
      position: "center",
      background: WHITE,
    })
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: WHITE,
    })
    .png({ compressionLevel: 9 })
    .toBuffer();

  return sharp(body).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
}

async function main() {
  if (!fs.existsSync(logoSrc)) {
    console.error(`Missing source: ${logoSrc}`);
    process.exit(1);
  }
  if (!fs.existsSync(favSrc)) {
    console.error(`Missing favicon source: ${favSrc}`);
    process.exit(1);
  }

  fs.mkdirSync(iconsDir, { recursive: true });

  const [b16, b32, b48, fav32, apple180, a192, a512, m192, m512, tile150, logo1024, shortcut192] =
    await Promise.all([
      rasterFavicon(favSrc, 16),
      rasterFavicon(favSrc, 32),
      rasterFavicon(favSrc, 48),
      rasterFavicon(favSrc, 32),
      rasterContain(logoSrc, 180),
      rasterContain(logoSrc, 192),
      rasterContain(logoSrc, 512),
      rasterMaskable(logoSrc, 192),
      rasterMaskable(logoSrc, 512),
      rasterContain(logoSrc, 150),
      rasterContain(logoSrc, 1024),
      rasterContain(logoSrc, 192),
    ]);

  const ico = await pngToIco([b16, b32, b48]);
  fs.writeFileSync(path.join(appDir, "favicon.ico"), ico);
  fs.writeFileSync(path.join(appDir, "icon.png"), fav32);
  fs.writeFileSync(path.join(appDir, "apple-icon.png"), apple180);

  fs.writeFileSync(path.join(publicDir, "favicon-16x16.png"), b16);
  fs.writeFileSync(path.join(publicDir, "favicon-32x32.png"), b32);
  fs.writeFileSync(path.join(publicDir, "android-chrome-192x192.png"), a192);
  fs.writeFileSync(path.join(publicDir, "android-chrome-512x512.png"), a512);
  fs.writeFileSync(path.join(publicDir, "android-chrome-192x192-maskable.png"), m192);
  fs.writeFileSync(path.join(publicDir, "android-chrome-512x512-maskable.png"), m512);
  fs.writeFileSync(path.join(publicDir, "apple-touch-icon.png"), apple180);
  fs.writeFileSync(path.join(publicDir, "mstile-150x150.png"), tile150);
  fs.writeFileSync(path.join(publicDir, "logo-app.png"), logo1024);
  fs.writeFileSync(path.join(iconsDir, "shortcut-dashboard.png"), shortcut192);
  fs.writeFileSync(path.join(iconsDir, "shortcut-pos.png"), shortcut192);

  console.log(
    `Source: ${path.relative(root, logoSrc)}`,
  );
  console.log(
    "Favicons: src/app/favicon.ico, src/app/icon.png, public/favicon-*.png",
  );
  console.log(
    "PWA / Android: android-chrome-*, maskable, apple-touch-icon, logo-app.png",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
