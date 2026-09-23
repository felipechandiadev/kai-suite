/**
 * Helpers post-tauri-build: list artifacts for DMG (Apple Silicon) / MSI (Win x64).
 * Actual bundling: `npm run tauri:build:mac` / `tauri:build:windows`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bundle = path.join(__dirname, "..", "src-tauri", "target", "release", "bundle");

console.log("KaiStore Lite package helper");
console.log("Expected after tauri build:");
console.log("  macOS DMG:  src-tauri/target/release/bundle/dmg/*.dmg  (aarch64)");
console.log("  Windows MSI: src-tauri/target/release/bundle/msi/*.msi (x86_64)");
if (fs.existsSync(bundle)) {
  console.log("\nFound bundle dir:");
  for (const ent of fs.readdirSync(bundle, { withFileTypes: true })) {
    console.log(" -", ent.name);
  }
} else {
  console.log("\nNo bundle yet — run npm run tauri:build:mac or tauri:build:windows");
}
