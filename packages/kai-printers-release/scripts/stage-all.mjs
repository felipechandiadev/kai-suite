#!/usr/bin/env node
/**
 * Prepara Kai Printers (Android + Windows + macOS) en dist/kai-downloads/:
 * binarios + manifests listos para subir a la carpeta pública de KAI_DOWNLOADS_URL.
 *
 * Uso (desde la raíz del monorepo):
 *   npm run kai-printers:release
 *   npm run kai-printers:release -- --build
 *   npm run kai-printers:release -- --android-only
 *   npm run kai-printers:release -- --desktop-only
 *   npm run kai-printers:release -- --bump patch
 *   npm run kai-printers:release -- --windows-only --build
 */
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, "..", "..", "..");

const argv = process.argv.slice(2);
const args = new Set(argv);

const androidOnly = args.has("--android-only");
const desktopOnly = args.has("--desktop-only");
const windowsOnly = args.has("--windows-only");
const macosOnly = args.has("--macos-only");

const runAndroid = !desktopOnly && !windowsOnly && !macosOnly;
const runDesktop = !androidOnly;

function runStep(label, cmd) {
  console.log(`\n${"═".repeat(60)}\n▶ ${label}\n${"═".repeat(60)}`);
  execSync(cmd, { cwd: repoRoot, stdio: "inherit" });
}

function androidCmd() {
  const bumpIdx = argv.indexOf("--bump");
  if (bumpIdx >= 0 && argv[bumpIdx + 1]) {
    return `bash kai-printers-android/scripts/stage-downloads.sh --bump ${argv[bumpIdx + 1]}`;
  }
  return "bash kai-printers-android/scripts/stage-downloads.sh";
}

function desktopCmd() {
  const passthrough = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--android-only" || a === "--desktop-only") continue;
    if (a === "--bump") {
      i += 1;
      continue;
    }
    passthrough.push(a);
  }
  const flags = passthrough.join(" ");
  return `node packages/kai-printers-release/scripts/stage-desktop-downloads.mjs${flags ? ` ${flags}` : ""}`;
}

console.log("Kai Printers — release unificado → dist/kai-downloads/\n");

let ran = 0;

if (runAndroid) {
  const androidDir = join(repoRoot, "kai-printers-android");
  if (!existsSync(androidDir)) {
    console.warn("⚠️  kai-printers-android/ no encontrado — se omite Android.");
  } else {
    runStep("Android (APK)", androidCmd());
    ran += 1;
  }
}

if (runDesktop) {
  const desktopDir = join(repoRoot, "kai-printers-desktop");
  if (!existsSync(desktopDir)) {
    console.warn("⚠️  kai-printers-desktop/ no encontrado — se omite Windows/macOS.");
  } else {
    runStep("Desktop (Windows ZIP + macOS DMG)", desktopCmd());
    ran += 1;
  }
}

if (ran === 0) {
  console.error(
    "Nada que preparar. Verificá que existan kai-printers-android/ y/o kai-printers-desktop/.",
  );
  process.exit(1);
}

console.log(`\n${"═".repeat(60)}`);
console.log("✅ Release local listo en dist/kai-downloads/ (o KAI_DOWNLOADS_OUT_DIR).");
console.log("\nSiguiente paso: subir binarios + *.manifest.json a la carpeta pública de KAI_DOWNLOADS_URL.");
console.log("POS y Admin leen los manifests desde ahí (sin redeploy).");
