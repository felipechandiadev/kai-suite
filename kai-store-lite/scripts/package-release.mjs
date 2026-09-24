/**
 * Helpers post-tauri-build: list artifacts for DMG / MSI / DEB / portable zip.
 * Actual bundling: `tauri:build:mac` / `tauri:build:windows` / `tauri:build:linux`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "src-tauri", "target");
const candidates = [
  path.join(root, "aarch64-apple-darwin", "release", "bundle"),
  path.join(root, "release", "bundle"),
  path.join(root, "x86_64-pc-windows-msvc", "release", "bundle"),
  path.join(root, "x86_64-unknown-linux-gnu", "release", "bundle"),
];

console.log("KaiStore Lite package helper");
console.log("Expected after tauri build (in-process sqlx; no Node sidecar):");
console.log("  macOS DMG:  target/aarch64-apple-darwin/release/bundle/dmg/*.dmg");
console.log("  macOS .app: target/aarch64-apple-darwin/release/bundle/macos/*.app");
console.log("  Windows MSI: target/.../release/bundle/msi/*.msi");
console.log("  Linux DEB:  target/x86_64-unknown-linux-gnu/release/bundle/deb/*.deb");
console.log("  dist-release/: portable zip / .deb copies");

let found = false;
for (const bundle of candidates) {
  if (!fs.existsSync(bundle)) continue;
  found = true;
  console.log("\nFound bundle dir:", bundle);
  for (const ent of fs.readdirSync(bundle, { withFileTypes: true })) {
    console.log(" -", ent.name);
  }
}
if (!found) {
  console.log(
    "\nNo bundle yet — run npm run tauri:build:mac | tauri:build:windows | tauri:build:linux",
  );
}
