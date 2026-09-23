/**
 * Genera iconos Tauri desde public/kai-store-lite.png
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = path.join(root, "public", "kai-store-lite.png");
const icons = path.join(root, "src-tauri", "icons");

if (!fs.existsSync(src)) {
  console.error("Missing", src);
  process.exit(1);
}

fs.mkdirSync(icons, { recursive: true });

await sharp(src).resize(32, 32).png().toFile(path.join(icons, "32x32.png"));
await sharp(src).resize(128, 128).png().toFile(path.join(icons, "128x128.png"));
await sharp(src).resize(256, 256).png().toFile(path.join(icons, "128x128@2x.png"));
await sharp(src).resize(512, 512).png().toFile(path.join(icons, "icon.png"));
await sharp(src).resize(44, 44).png().toFile(path.join(icons, "tray-icon.png"));
await sharp(src).resize(44, 44).png().toFile(path.join(icons, "tray-icon-mac.png"));

console.log("Icons written to", icons);
console.log("Run `npx tauri icon src-tauri/icons/icon.png` for .icns/.ico when shipping.");
