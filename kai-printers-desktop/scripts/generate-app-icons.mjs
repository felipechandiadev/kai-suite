/**
 * Genera iconos Tauri y copia assets de branding KaiPrinters.
 *
 * Fuentes (public/):
 *   - kai-printers.png          → Dock / app (.icns, .ico, bundle PNGs)
 *   - KaiPrinters-mac-bar.png   → Barra de menú macOS (tray)
 *   - logo.png                  → UI (footer); no se sobrescribe
 *
 * Uso: npm run generate-icons  (también corre en pretauri:build)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const publicDir = path.join(root, "public");
const assetsDir = path.join(root, "assets");
const appIconSource = path.join(publicDir, "kai-printers.png");
const trayIconSource = path.join(publicDir, "KaiPrinters-mac-bar.png");
const uiLogo = path.join(publicDir, "logo.png");
const squareLogo = path.join(assetsDir, "logo-square.png");
const iconsOut = path.join(root, "src-tauri", "icons");
const trayIconOut = path.join(iconsOut, "tray-icon.png");
const tauriCli = path.join(root, "node_modules", "@tauri-apps", "cli", "tauri.js");

const SQUARE_SIZE = 1024;
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };
const TRAY_SIZE = 44;

function requireFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    console.error(`Falta ${label}: ${filePath}`);
    process.exit(1);
  }
}

/** Cuadrado para `tauri icon` (Dock / Control Center / .icns). */
async function buildSquareFromAppIcon() {
  fs.mkdirSync(assetsDir, { recursive: true });
  await sharp(appIconSource)
    .resize(SQUARE_SIZE, SQUARE_SIZE, {
      fit: "contain",
      position: "center",
      background: WHITE,
    })
    .png({ compressionLevel: 9 })
    .toFile(squareLogo);
  console.log(`Fuente cuadrada: assets/logo-square.png (${SQUARE_SIZE}×${SQUARE_SIZE}) desde kai-printers.png`);
}

/** Icono de barra superior macOS (template-friendly, 44×44 @2x). */
async function buildTrayIcon() {
  fs.mkdirSync(iconsOut, { recursive: true });
  await sharp(trayIconSource)
    .resize(TRAY_SIZE, TRAY_SIZE, {
      fit: "contain",
      position: "center",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(trayIconOut);
  console.log(`Tray macOS: src-tauri/icons/tray-icon.png (${TRAY_SIZE}×${TRAY_SIZE})`);
}

/** Favicons web (dev); no modifica public/logo.png (UI). */
async function buildWebFavicons() {
  const [b32, b180] = await Promise.all([
    sharp(squareLogo).resize(32, 32).png().toBuffer(),
    sharp(squareLogo).resize(180, 180).png().toBuffer(),
  ]);
  fs.writeFileSync(path.join(publicDir, "favicon-32x32.png"), b32);
  fs.writeFileSync(path.join(publicDir, "apple-touch-icon.png"), b180);
  console.log("Favicons: public/favicon-32x32.png, public/apple-touch-icon.png");
}

function runTauriIcon() {
  if (!fs.existsSync(tauriCli)) {
    console.error("Ejecutá npm install en kai-printers-desktop antes de generar iconos.");
    process.exit(1);
  }
  const result = spawnSync(
    process.execPath,
    [tauriCli, "icon", squareLogo, "-o", iconsOut, "--ios-color", "#ffffff"],
    { cwd: root, stdio: "inherit" },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
  console.log(`Iconos app: ${path.relative(root, iconsOut)}/ (icon.icns, icon.ico, …)`);
}

requireFile(appIconSource, "icono de app (Dock)");
requireFile(trayIconSource, "icono barra macOS");
if (!fs.existsSync(uiLogo)) {
  console.warn(`Aviso: no hay public/logo.png para el footer de la UI.`);
} else {
  console.log("UI footer: public/logo.png (sin cambios)");
}

await buildSquareFromAppIcon();
await buildTrayIcon();
await buildWebFavicons();
runTauriIcon();
