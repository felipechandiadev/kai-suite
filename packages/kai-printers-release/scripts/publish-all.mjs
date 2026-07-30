#!/usr/bin/env node
/**
 * Publica Kai Printers (Android + Windows + macOS) en kai-pos/public/downloads/.
 *
 * Uso (desde la raíz del monorepo):
 *   npm run kai-printers:publish
 *   npm run kai-printers:publish -- --build
 *   npm run kai-printers:publish -- --android-only
 *   npm run kai-printers:publish -- --desktop-only
 *   npm run kai-printers:publish -- --bump patch
 *   npm run kai-printers:publish -- --windows-only --build
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
    return `bash kai-printers-android/scripts/publish-to-pos-downloads.sh --bump ${argv[bumpIdx + 1]}`;
  }
  return "bash kai-printers-android/scripts/publish-to-pos-downloads.sh";
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
  return `node packages/kai-printers-release/scripts/publish-to-pos-downloads.mjs${flags ? ` ${flags}` : ""}`;
}

console.log("Kai Printers — publicación unificada → kai-pos/public/downloads/\n");

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
    "Nada que publicar. Verificá que existan kai-printers-android/ y/o kai-printers-desktop/.",
  );
  process.exit(1);
}

console.log(`\n${"═".repeat(60)}`);
console.log("✅ Publicación local lista.");
console.log("\nSiguiente paso — deploy al VPS (ver kai-pos/public/downloads/README.md):");
console.log("  1. git add kai-pos/public/downloads/*.manifest.json (+ version.properties si Android bump)");
console.log("  2. git commit && git push");
console.log("  3. En el VPS: git pull");
console.log("  4. rsync kai-pos/public/downloads/ al VPS (binarios .apk/.zip/.dmg no van en git)");
console.log("  5. Probar: https://tu-pos.cl/downloads/kai-printers-android.manifest.json");
