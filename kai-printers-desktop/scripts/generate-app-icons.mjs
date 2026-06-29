/**
 * Genera iconos Tauri y copia assets de branding KaiPrinters.
 *
 * Fuentes (public/):
 *   - kai-printers.png           → Windows/Linux app (.ico, PNGs bundle)
 *   - kai-printers-mac-dock.png  → macOS Dock / .icns (logo completo ola + KAI)
 *   - KaiPrinters-mac-bar.png    → Barra de menú macOS (tray blanco)
 *   - logo.png                   → UI (footer); no se sobrescribe
 *
 * Salidas tray:
 *   - tray-icon-mac.png  → macOS (silueta blanca)
 *   - tray-icon.png      → Windows / Linux (favicon a color)
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
const macDockSource = path.join(publicDir, "kai-printers-mac-dock.png");
const trayMacSource = path.join(publicDir, "KaiPrinters-mac-bar.png");
const uiLogo = path.join(publicDir, "logo.png");
const squareLogo = path.join(assetsDir, "logo-square.png");
const squareLogoMac = path.join(assetsDir, "logo-square-mac.png");
const iconsOut = path.join(root, "src-tauri", "icons");
const macIconsTmp = path.join(assetsDir, ".icons-mac-tmp");
const trayMacOut = path.join(iconsOut, "tray-icon-mac.png");
const trayDefaultOut = path.join(iconsOut, "tray-icon.png");
const tauriCli = path.join(root, "node_modules", "@tauri-apps", "cli", "tauri.js");

const SQUARE_SIZE = 1024;
const TRAY_SIZE = 44;
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

function requireFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    console.error(`Falta ${label}: ${filePath}`);
    process.exit(1);
  }
}

/** Cuadrado favicon para Windows/Linux (.ico, PNGs). */
async function buildSquareFromAppIcon() {
  fs.mkdirSync(assetsDir, { recursive: true });
  await sharp(appIconSource)
    .resize(SQUARE_SIZE, SQUARE_SIZE, { fit: "fill" })
    .png({ compressionLevel: 9 })
    .toFile(squareLogo);
  console.log(`Fuente Windows/Linux: assets/logo-square.png desde kai-printers.png`);
}

/** Cuadrado logo completo para macOS Dock (.icns). */
async function buildSquareFromMacDockIcon() {
  await sharp(macDockSource)
    .resize(SQUARE_SIZE, SQUARE_SIZE, { fit: "contain", position: "center", background: TRANSPARENT })
    .png({ compressionLevel: 9 })
    .toFile(squareLogoMac);
  console.log(`Fuente macOS Dock: assets/logo-square-mac.png desde kai-printers-mac-dock.png`);
}

/** Tray macOS: silueta blanca 44×44. */
async function buildTrayMacIcon() {
  fs.mkdirSync(iconsOut, { recursive: true });
  await sharp(trayMacSource)
    .resize(TRAY_SIZE, TRAY_SIZE, {
      fit: "contain",
      position: "center",
      background: TRANSPARENT,
    })
    .png()
    .toFile(trayMacOut);
  console.log(`Tray macOS: src-tauri/icons/tray-icon-mac.png (${TRAY_SIZE}×${TRAY_SIZE})`);
}

/** Tray Windows/Linux: favicon a color 44×44. */
async function buildTrayDefaultIcon() {
  await sharp(appIconSource)
    .resize(TRAY_SIZE, TRAY_SIZE, {
      fit: "contain",
      position: "center",
      background: TRANSPARENT,
    })
    .png()
    .toFile(trayDefaultOut);
  console.log(`Tray Windows/Linux: src-tauri/icons/tray-icon.png (${TRAY_SIZE}×${TRAY_SIZE})`);
}

/** Favicons web (dev); recorte + zoom como en PWA. */
async function buildWebFavicons() {
  const trimmed = await sharp(appIconSource).trim({ threshold: 12 }).png().toBuffer();
  const fav32 = async (size) => {
    const zoom = Math.round(size * 1.06);
    return sharp(trimmed)
      .resize(zoom, zoom, { fit: "cover", position: "centre" })
      .extract({
        left: Math.floor((zoom - size) / 2),
        top: Math.floor((zoom - size) / 2),
        width: size,
        height: size,
      })
      .png()
      .toBuffer();
  };
  const [b32, b180] = await Promise.all([fav32(32), sharp(appIconSource).resize(180, 180).png().toBuffer()]);
  fs.writeFileSync(path.join(publicDir, "favicon-32x32.png"), b32);
  fs.writeFileSync(path.join(publicDir, "apple-touch-icon.png"), b180);
  console.log("Favicons: public/favicon-32x32.png, public/apple-touch-icon.png");
}

function runTauriIcon(input, outputDir) {
  if (!fs.existsSync(tauriCli)) {
    console.error("Ejecutá npm install en kai-printers-desktop antes de generar iconos.");
    process.exit(1);
  }
  const result = spawnSync(
    process.execPath,
    [tauriCli, "icon", input, "-o", outputDir, "--ios-color", "#ffffff"],
    { cwd: root, stdio: "inherit" },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

/** Windows/Linux + PNGs; luego reemplaza solo icon.icns con el logo completo. */
function runTauriIconsSplitByPlatform() {
  runTauriIcon(squareLogo, iconsOut);
  console.log(`Iconos app: ${path.relative(root, iconsOut)}/ (.ico, PNGs desde favicon)`);

  fs.rmSync(macIconsTmp, { recursive: true, force: true });
  fs.mkdirSync(macIconsTmp, { recursive: true });
  runTauriIcon(squareLogoMac, macIconsTmp);

  const macIcns = path.join(macIconsTmp, "icon.icns");
  if (!fs.existsSync(macIcns)) {
    console.error("No se generó icon.icns para macOS Dock");
    process.exit(1);
  }
  fs.copyFileSync(macIcns, path.join(iconsOut, "icon.icns"));
  fs.rmSync(macIconsTmp, { recursive: true, force: true });
  console.log(`macOS Dock: src-tauri/icons/icon.icns (logo completo ola + KAI)`);
}

requireFile(appIconSource, "icono app Windows/Linux (kai-favicon)");
requireFile(macDockSource, "icono macOS Dock (kai-logo)");
requireFile(trayMacSource, "icono barra macOS (tray blanco)");
if (!fs.existsSync(uiLogo)) {
  console.warn("Aviso: no hay public/logo.png para el footer de la UI.");
} else {
  console.log("UI footer: public/logo.png (sin cambios)");
}

await buildSquareFromAppIcon();
await buildSquareFromMacDockIcon();
await buildTrayMacIcon();
await buildTrayDefaultIcon();
await buildWebFavicons();
runTauriIconsSplitByPlatform();
