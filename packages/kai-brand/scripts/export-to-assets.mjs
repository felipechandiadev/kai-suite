#!/usr/bin/env node
/**
 * Copia iconos generados a assets/brand/kai-store/exports/ (inventario versionado).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const brandRoot = path.join(__dirname, "..");
const repoRoot = path.join(brandRoot, "..", "..");
const exportsRoot = path.join(repoRoot, "assets", "brand", "kai-store", "exports");

const PWA_ICON_NAMES = [
  "favicon-16x16.png",
  "favicon-32x32.png",
  "apple-touch-icon.png",
  "android-chrome-192x192.png",
  "android-chrome-512x512.png",
  "android-chrome-192x192-maskable.png",
  "android-chrome-512x512-maskable.png",
  "logo-app.png",
  "mstile-150x150.png",
  "logo.png",
];

const PWA_APPS = ["pwa-admin", "pwa-pos", "pwa-stock", "pwa-eshop"];

function cpFile(src, dest) {
  if (!fs.existsSync(src)) return false;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return true;
}

function cpDir(src, dest) {
  if (!fs.existsSync(src)) return false;
  fs.mkdirSync(dest, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, ent.name);
    const to = path.join(dest, ent.name);
    if (ent.isDirectory()) cpDir(from, to);
    else fs.copyFileSync(from, to);
  }
  return true;
}

function exportPwa() {
  const pwaOut = path.join(exportsRoot, "pwa");
  fs.mkdirSync(pwaOut, { recursive: true });

  // Set compartido desde admin (mismo icono en todas las apps)
  const adminPublic = path.join(repoRoot, "pwa-admin", "public");
  for (const name of PWA_ICON_NAMES) {
    cpFile(path.join(adminPublic, name), path.join(pwaOut, name));
  }

  // logo-ui alias
  cpFile(path.join(adminPublic, "logo.png"), path.join(pwaOut, "logo-ui-1024.png"));

  for (const app of PWA_APPS) {
    const appOut = path.join(pwaOut, app.replace("pwa-", ""));
    for (const name of PWA_ICON_NAMES) {
      cpFile(path.join(repoRoot, app, "public", name), path.join(appOut, name));
    }
  }
  console.log(`exports/pwa/ ← ${PWA_APPS.length} apps`);
}

function exportAndroid() {
  const androidOut = path.join(exportsRoot, "android");
  const play512 = path.join(repoRoot, "packages", "kai-printers-brand", "sources", "kai-printers.png");
  cpFile(play512, path.join(androidOut, "play-store-512.png"));

  for (const app of ["kai-printers-android", "kai-screen-android"]) {
    const resSrc = path.join(repoRoot, app, "app", "src", "main", "res");
    cpDir(resSrc, path.join(androidOut, app));
  }
  console.log("exports/android/ ← play-store + res snapshots");
}

function exportDesktop() {
  const desktopOut = path.join(exportsRoot, "desktop");
  const iconsDir = path.join(repoRoot, "kai-printers-desktop", "src-tauri", "icons");
  if (!fs.existsSync(iconsDir)) {
    console.warn("Skip exports/desktop (no kai-printers-desktop/src-tauri/icons/)");
    return;
  }

  for (const name of ["icon.ico", "icon.icns", "32x32.png", "128x128.png", "128x128@2x.png", "icon.png"]) {
    cpFile(path.join(iconsDir, name), path.join(desktopOut, name));
  }
  const tray = path.join(repoRoot, "kai-printers-desktop", "public", "KaiPrinters-mac-bar.png");
  cpFile(tray, path.join(desktopOut, "KaiPrinters-mac-bar.png"));
  console.log("exports/desktop/ ← Tauri icons");
}

function main() {
  fs.mkdirSync(exportsRoot, { recursive: true });
  exportPwa();
  exportAndroid();
  exportDesktop();
  console.log(`\nInventario: ${path.relative(repoRoot, exportsRoot)}/`);
}

main();
