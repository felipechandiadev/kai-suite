#!/usr/bin/env node
/**
 * Rasteriza fuentes SVG de marca → PNG 1024 en packages/kai-brand/sources/.
 *
 * Fuentes (assets/brand/kai-store/source/):
 *   - kai-favicon.svg      → favicon-1024.png, master-1024.png (favicon pestaña, app instalada)
 *   - kai-logo.svg         → logo-ui-1024.png (top bar, login, sidebar, tickets)
 *   - kai-tray-white.svg   → tray-white-1024.png (tray macOS, notificaciones Android)
 *   - kai-tray-black.svg   → tray-black-1024.png (solo composición; no icono solo)
 *
 * Uso: node scripts/rasterize-svg.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const brandRoot = path.join(__dirname, "..");
const repoRoot = path.join(brandRoot, "..", "..");
const SOURCE_DIR = path.join(repoRoot, "assets", "brand", "kai-store", "source");
const OUT_DIR = path.join(brandRoot, "sources");
const OUT_SIZE = 1024;

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

const RASTER_TARGETS = [
  { svg: "kai-favicon.svg", out: "favicon-1024.png" },
  { svg: "kai-logo.svg", out: "logo-ui-1024.png" },
  { svg: "kai-tray-white.svg", out: "tray-white-1024.png" },
  { svg: "kai-tray-black.svg", out: "tray-black-1024.png" },
];

async function rasterizeSvgFull(svgPath, outPath) {
  await sharp(svgPath)
    .resize(OUT_SIZE, OUT_SIZE, { fit: "fill", background: TRANSPARENT })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const { svg, out } of RASTER_TARGETS) {
    const svgPath = path.join(SOURCE_DIR, svg);
    if (!fs.existsSync(svgPath)) {
      console.error(`No se encontró SVG: ${svgPath}`);
      process.exit(1);
    }
    const outPath = path.join(OUT_DIR, out);
    await rasterizeSvgFull(svgPath, outPath);
    console.log(`Raster: ${path.relative(repoRoot, svgPath)} → ${path.relative(repoRoot, outPath)}`);
  }

  const master = path.join(OUT_DIR, "master-1024.png");
  fs.copyFileSync(path.join(OUT_DIR, "favicon-1024.png"), master);
  console.log(`Alias: master-1024.png ← favicon-1024.png`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
