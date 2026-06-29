#!/usr/bin/env node
/**
 * Cross-compile Windows sin empaquetar recursos Tauri (Sumatra va en el ZIP portable aparte).
 * Evita fallar cuando bin/windows/SumatraPDF.exe está gitignored.
 */
import { existsSync, renameSync, unlinkSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const winConf = join(root, "src-tauri", "tauri.windows.conf.json");
const winConfBak = `${winConf}.bak`;

if (!existsSync(join(root, "src-tauri", "bin", "windows", "SumatraPDF.exe"))) {
  console.error(
    "Falta SumatraPDF.exe. Ejecutá: npm run fetch-sumatra\n",
  );
  process.exit(1);
}

let moved = false;
if (existsSync(winConf)) {
  renameSync(winConf, winConfBak);
  moved = true;
}

try {
  execSync(
    "node ./node_modules/@tauri-apps/cli/tauri.js build --runner cargo-xwin --target x86_64-pc-windows-msvc --no-bundle",
    { cwd: root, stdio: "inherit", env: process.env },
  );
} finally {
  if (moved && existsSync(winConfBak)) {
    if (existsSync(winConf)) {
      unlinkSync(winConf);
    }
    renameSync(winConfBak, winConf);
  }
}
