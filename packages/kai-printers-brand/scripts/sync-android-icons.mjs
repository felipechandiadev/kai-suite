/**
 * Sincroniza iconos Android Studio export → kai-printers-android y kai-screen-android.
 *
 * Fuente:
 * - sources/android-studio-res/ (mipmap webp + adaptive XML desde Android Studio)
 * - sources/kai-printers.png (play store) → generate para monochrome + notification
 *
 * Uso: npm run sync
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const repoRoot = path.join(root, "..", "..");
const studioRes = path.join(root, "sources", "android-studio-res");

const TARGETS = [
  path.join(repoRoot, "kai-printers-android", "app", "src", "main", "res"),
  path.join(repoRoot, "kai-screen-android", "app", "src", "main", "res"),
];

const MIPMAP_FOLDERS = [
  "mipmap-mdpi",
  "mipmap-hdpi",
  "mipmap-xhdpi",
  "mipmap-xxhdpi",
  "mipmap-xxxhdpi",
  "mipmap-anydpi-v26",
];

const DRAWABLE_FOLDERS = [
  "drawable-mdpi",
  "drawable-hdpi",
  "drawable-xhdpi",
  "drawable-xxhdpi",
  "drawable-xxxhdpi",
];

const LEGACY_LAUNCHER_PNG = [
  "ic_launcher.png",
  "ic_launcher_round.png",
  "ic_launcher_foreground.png",
];

function copyDirFiles(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  for (const name of fs.readdirSync(srcDir)) {
    const from = path.join(srcDir, name);
    const to = path.join(destDir, name);
    if (fs.statSync(from).isDirectory()) continue;
    fs.copyFileSync(from, to);
  }
}

function removeLegacyLauncherPng(resDir) {
  for (const folder of MIPMAP_FOLDERS) {
    const dir = path.join(resDir, folder);
    if (!fs.existsSync(dir)) continue;
    for (const name of LEGACY_LAUNCHER_PNG) {
      const file = path.join(dir, name);
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  }
}

function writeAdaptiveXmlWithMonochrome(resDir) {
  const dir = path.join(resDir, "mipmap-anydpi-v26");
  fs.mkdirSync(dir, { recursive: true });
  const body = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <background android:drawable="@mipmap/ic_launcher_background"/>
  <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
  <monochrome android:drawable="@drawable/ic_launcher_monochrome"/>
</adaptive-icon>
`;
  fs.writeFileSync(path.join(dir, "ic_launcher.xml"), body);
  fs.writeFileSync(path.join(dir, "ic_launcher_round.xml"), body);
}

function syncStudioExport(targetRes) {
  removeLegacyLauncherPng(targetRes);

  for (const folder of MIPMAP_FOLDERS) {
    copyDirFiles(path.join(studioRes, folder), path.join(targetRes, folder));
  }

  const valuesSrc = path.join(studioRes, "values", "ic_launcher_background.xml");
  if (fs.existsSync(valuesSrc)) {
    const valuesDest = path.join(targetRes, "values");
    fs.mkdirSync(valuesDest, { recursive: true });
    fs.copyFileSync(valuesSrc, path.join(valuesDest, "ic_launcher_background.xml"));
  }

  writeAdaptiveXmlWithMonochrome(targetRes);
}

function syncDrawableAssets(targetRes) {
  const generated = path.join(root, "output", "android");
  for (const folder of DRAWABLE_FOLDERS) {
    copyDirFiles(path.join(generated, folder), path.join(targetRes, folder));
  }
}

function main() {
  if (!fs.existsSync(studioRes)) {
    console.error(`Missing Android Studio export: ${studioRes}`);
    process.exit(1);
  }

  const gen = spawnSync("node", ["scripts/generate-android-icons.mjs"], {
    cwd: root,
    stdio: "inherit",
  });
  if (gen.status !== 0) process.exit(gen.status ?? 1);

  for (const target of TARGETS) {
    if (!fs.existsSync(path.dirname(target))) {
      console.warn(`Skip missing app res: ${target}`);
      continue;
    }
    syncStudioExport(target);
    syncDrawableAssets(target);
    console.log(`Synced → ${path.relative(repoRoot, target)}`);
  }
}

main();
