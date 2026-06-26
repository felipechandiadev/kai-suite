#!/usr/bin/env node
/**
 * Genera iconos KaiStore para todas las apps desde packages/kai-brand/sources/.
 *
 * Matriz: ver ICON_MATRIX.md
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import sharp from "sharp";
import { generateAndroidRes } from "./lib/android-icons.mjs";
import { generatePwaIconSet, generateShortcutIcon, squarePng } from "./lib/pwa-icons.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const brandRoot = path.join(__dirname, "..");
const repoRoot = path.join(brandRoot, "..", "..");
const sources = path.join(brandRoot, "sources");

const SRC = {
  adminFavicon: path.join(sources, "admin-manager.png"),
  adminApp: path.join(sources, "admin-manager.png"),
  posDesktop: path.join(sources, "pos-desktop.png"),
  stockDesktop: path.join(sources, "stock-desktop.png"),
  eshopDesktop: path.join(sources, "eshop-desktop.png"),
  androidShared: path.join(sources, "android-shared.png"),
  printersTauri: path.join(sources, "printers-tauri.png"),
  brandLogo: path.join(sources, "brand-logo.png"),
};

const PWA_APPS = [
  {
    id: "admin",
    publicDir: path.join(repoRoot, "pwa-admin", "public"),
    appIcon: SRC.adminApp,
    androidIcon: null,
    shortcuts: [{ file: "icons/shortcut-dashboard.png", source: SRC.adminApp }],
  },
  {
    id: "pos",
    publicDir: path.join(repoRoot, "pwa-pos", "public"),
    appIcon: SRC.posDesktop,
    androidIcon: SRC.androidShared,
    shortcuts: [{ file: "icons/shortcut-pos.png", source: SRC.posDesktop }],
  },
  {
    id: "stock",
    publicDir: path.join(repoRoot, "pwa-stock", "public"),
    appIcon: SRC.stockDesktop,
    androidIcon: null,
    shortcuts: [],
  },
  {
    id: "eshop",
    publicDir: path.join(repoRoot, "pwa-eshop", "public"),
    appIcon: SRC.eshopDesktop,
    androidIcon: null,
    shortcuts: [],
  },
];

const ANDROID_APPS = [
  path.join(repoRoot, "kai-printers-android", "app", "src", "main", "res"),
  path.join(repoRoot, "kai-screen-android", "app", "src", "main", "res"),
];

function requireSources() {
  for (const [key, file] of Object.entries(SRC)) {
    if (!fs.existsSync(file)) {
      console.error(`Falta source ${key}: ${file}`);
      process.exit(1);
    }
  }
}

async function syncPwaIcons() {
  for (const app of PWA_APPS) {
    await generatePwaIconSet({
      outDir: app.publicDir,
      faviconSource: SRC.adminFavicon,
      appIconSource: app.appIcon,
      androidIconSource: app.androidIcon ?? undefined,
    });
    for (const sc of app.shortcuts) {
      await generateShortcutIcon(sc.source, path.join(app.publicDir, sc.file));
    }
    console.log(`PWA ${app.id} → ${path.relative(repoRoot, app.publicDir)}/`);
  }
}

async function syncAndroidIcons() {
  for (const resDir of ANDROID_APPS) {
    if (!fs.existsSync(path.dirname(resDir))) {
      console.warn(`Skip Android (no existe): ${resDir}`);
      continue;
    }
    await generateAndroidRes(SRC.androidShared, resDir);
    console.log(`Android → ${path.relative(repoRoot, resDir)}/`);
  }

  const play512 = path.join(repoRoot, "packages", "kai-printers-brand", "sources");
  fs.mkdirSync(play512, { recursive: true });
  const buf = await squarePng(SRC.androidShared, 512);
  fs.writeFileSync(path.join(play512, "kai-printers.png"), buf);
  fs.copyFileSync(SRC.androidShared, path.join(play512, "kai-screen.png"));
}

async function syncTauriIcons() {
  const printService = path.join(repoRoot, "print-service");
  const publicDir = path.join(printService, "public");
  fs.mkdirSync(publicDir, { recursive: true });

  const square = await squarePng(SRC.printersTauri, 1024);
  fs.writeFileSync(path.join(publicDir, "kai-printers.png"), square);

  const traySrc = path.join(publicDir, "KaiPrinters-mac-bar.png");
  if (!fs.existsSync(traySrc)) {
    const tray = await squarePng(SRC.printersTauri, 44, {
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });
    fs.writeFileSync(traySrc, tray);
    console.warn("Tray: generado desde printers-tauri (no había KaiPrinters-mac-bar.png)");
  }

  const gen = spawnSync("npm", ["run", "generate-icons"], {
    cwd: printService,
    stdio: "inherit",
    env: process.env,
  });
  if (gen.status !== 0) {
    console.error("print-service generate-icons falló (¿npm install en print-service?)");
    process.exit(gen.status ?? 1);
  }
  console.log("Tauri Kai Printers → print-service/src-tauri/icons/");
}

async function syncBrandLogos() {
  const logoTargets = [
    path.join(repoRoot, "pwa-admin", "public", "logo.png"),
    path.join(repoRoot, "pwa-pos", "public", "logo.png"),
    path.join(repoRoot, "pwa-stock", "public", "logo.png"),
    path.join(repoRoot, "pwa-eshop", "public", "logo.png"),
  ];
  for (const target of logoTargets) {
    if (!fs.existsSync(path.dirname(target))) continue;
    fs.copyFileSync(SRC.brandLogo, target);
  }
  console.log("Logo UI (brand-logo) copiado a public/logo.png de cada PWA");
}

async function main() {
  requireSources();
  console.log("==> Kai Brand — generación de iconos\n");
  await syncPwaIcons();
  await syncAndroidIcons();
  await syncTauriIcons();
  await syncBrandLogos();
  console.log("\nListo. Revisá ICON_MATRIX.md para la matriz completa.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
