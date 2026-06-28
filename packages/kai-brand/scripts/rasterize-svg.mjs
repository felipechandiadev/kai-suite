#!/usr/bin/env node
/**
 * Rasteriza kai-logo.svg → master-1024.png (RGBA transparente).
 *
 * Uso: node scripts/rasterize-svg.mjs
 * Env: KAI_LOGO_SVG, KAI_LOGO_INNER_RATIO (default 0.88)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const brandRoot = path.join(__dirname, "..");
const repoRoot = path.join(brandRoot, "..", "..");

const SVG_DEFAULT = path.join(repoRoot, "assets", "brand", "kai-store", "source", "kai-logo.svg");
const OUT_DIR = path.join(brandRoot, "sources");
const OUT_MASTER = path.join(OUT_DIR, "master-1024.png");
const OUT_SIZE = 1024;
const INNER_RATIO = Number(process.env.KAI_LOGO_INNER_RATIO ?? "0.88");

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

async function rasterizeSvg(svgPath, outPath) {
  const inner = Math.round(OUT_SIZE * INNER_RATIO);
  const logo = await sharp(svgPath)
    .resize(inner, inner, { fit: "contain", position: "center", background: TRANSPARENT })
    .png()
    .toBuffer();

  await sharp({
    create: { width: OUT_SIZE, height: OUT_SIZE, channels: 4, background: TRANSPARENT },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(outPath);
}

async function main() {
  const svgPath = process.env.KAI_LOGO_SVG?.trim() || SVG_DEFAULT;
  if (!fs.existsSync(svgPath)) {
    console.error(`No se encontró SVG: ${svgPath}`);
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  await rasterizeSvg(svgPath, OUT_MASTER);
  console.log(`Raster: ${path.relative(repoRoot, svgPath)} → ${path.relative(repoRoot, OUT_MASTER)} (${OUT_SIZE}px, inner ${INNER_RATIO})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
