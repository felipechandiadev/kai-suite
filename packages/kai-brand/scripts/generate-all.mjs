#!/usr/bin/env node
/**
 * Genera iconos KaiStore para todas las apps desde kai-logo.svg (vía master-1024.png).
 *
 * Matriz: ver ICON_MATRIX.md
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { generateAndroidRes } from "./lib/android-icons.mjs";
import { generatePwaIconSet, generateShortcutIcon, squarePng } from "./lib/pwa-icons.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const brandRoot = path.join(__dirname, "..");
const repoRoot = path.join(brandRoot, "..", "..");
const MASTER = path.join(brandRoot, "sources", "master-1024.png");

const PWA_APPS = [
  {
    id: "admin",
    publicDir: path.join(repoRoot, "pwa-admin", "public"),
    shortcuts: [{ file: "icons/shortcut-dashboard.png" }],
  },
  {
    id: "pos",
    publicDir: path.join(repoRoot, "pwa-pos", "public"),
    shortcuts: [{ file: "icons/shortcut-pos.png" }],
  },
  {
    id: "stock",
    publicDir: path.join(repoRoot, "pwa-stock", "public"),
    shortcuts: [],
  },
  {
    id: "eshop",
    publicDir: path.join(repoRoot, "pwa-eshop", "public"),
    shortcuts: [],
  },
];

const ANDROID_APPS = [
  path.join(repoRoot, "kai-printers-android", "app", "src", "main", "res"),
  path.join(repoRoot, "kai-screen-android", "app", "src", "main", "res"),
];

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

function requireMaster() {
  if (!fs.existsSync(MASTER)) {
    console.error(`Falta ${MASTER}. Ejecutá: node scripts/rasterize-svg.mjs`);
    process.exit(1);
  }
}

async function syncPwaIcons() {
  for (const app of PWA_APPS) {
    await generatePwaIconSet({
      outDir: app.publicDir,
      faviconSource: MASTER,
      appIconSource: MASTER,
      androidIconSource: MASTER,
    });
    for (const sc of app.shortcuts) {
      await generateShortcutIcon(MASTER, path.join(app.publicDir, sc.file));
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
    await generateAndroidRes(MASTER, resDir);
    console.log(`Android → ${path.relative(repoRoot, resDir)}/`);
  }

  const play512 = path.join(repoRoot, "packages", "kai-printers-brand", "sources");
  fs.mkdirSync(play512, { recursive: true });
  const buf = await squarePng(MASTER, 512, { background: TRANSPARENT });
  fs.writeFileSync(path.join(play512, "kai-printers.png"), buf);
  fs.copyFileSync(path.join(play512, "kai-printers.png"), path.join(play512, "kai-screen.png"));
}

async function syncTauriIcons() {
  const printService = path.join(repoRoot, "kai-printers-desktop");
  if (!fs.existsSync(printService)) {
    console.warn("Skip Tauri (no existe kai-printers-desktop/)");
    return;
  }

  const publicDir = path.join(printService, "public");
  fs.mkdirSync(publicDir, { recursive: true });

  const square = await squarePng(MASTER, 1024, { background: TRANSPARENT });
  fs.writeFileSync(path.join(publicDir, "kai-printers.png"), square);

  const traySrc = path.join(publicDir, "KaiPrinters-mac-bar.png");
  const tray = await squarePng(MASTER, 44, { background: TRANSPARENT });
  fs.writeFileSync(traySrc, tray);

  const gen = spawnSync("npm", ["run", "generate-icons"], {
    cwd: printService,
    stdio: "inherit",
    env: process.env,
  });
  if (gen.status !== 0) {
    console.error("kai-printers-desktop generate-icons falló (¿npm install en kai-printers-desktop?)");
    process.exit(gen.status ?? 1);
  }
  console.log("Tauri Kai Printers → kai-printers-desktop/src-tauri/icons/");
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
    fs.copyFileSync(MASTER, target);
  }
  console.log("Logo UI (master) copiado a public/logo.png de cada PWA");
}

async function main() {
  requireMaster();
  console.log("==> Kai Brand — generación de iconos (unificado)\n");
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
