#!/usr/bin/env node
/**
 * Publica Kai Printers desktop (Windows ZIP + macOS DMG) en pwa-pos/public/downloads/.
 * Requiere kai-printers-desktop/ en el monorepo (gitignored localmente).
 *
 * Uso (desde raíz del monorepo):
 *   npm run kai-printers-desktop:publish
 *   npm run kai-printers-desktop:publish -- --build
 *   npm run kai-printers-desktop:publish -- --windows-only
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, "..", "..", "..");
const printServiceRoot = join(repoRoot, "kai-printers-desktop");
const downloadsDir = join(repoRoot, "pwa-pos", "public", "downloads");
const tauriConfPath = join(printServiceRoot, "src-tauri", "tauri.conf.json");

const args = new Set(process.argv.slice(2));
const forceBuild = args.has("--build");
const windowsOnly = args.has("--windows-only");
const macosOnly = args.has("--macos-only");

function readVersion() {
  if (!existsSync(tauriConfPath)) {
    console.error(`No se encontró ${tauriConfPath}. ¿Existe kai-printers-desktop/ localmente?`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(tauriConfPath, "utf8")).version;
}

function run(cmd, cwd) {
  console.log(`\n→ ${cmd}`);
  execSync(cmd, { cwd, stdio: "inherit" });
}

function writeManifest(filename, payload) {
  const dest = join(downloadsDir, filename);
  writeFileSync(dest, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Manifest: ${dest}`);
}

function removeByPrefix(prefix, ext) {
  if (!existsSync(downloadsDir)) return;
  for (const name of readdirSync(downloadsDir)) {
    if (name.startsWith(prefix) && name.endsWith(ext)) {
      rmSync(join(downloadsDir, name), { force: true });
    }
  }
}

function publishWindows(version) {
  const releaseDir = join(printServiceRoot, "release", "windows");
  const zipSrc = join(releaseDir, `KaiPrinters_${version}_x64-portable.zip`);
  const exeSrc = join(
    printServiceRoot,
    "src-tauri",
    "target",
    "x86_64-pc-windows-msvc",
    "release",
    "print-service.exe",
  );

  if (forceBuild || !existsSync(zipSrc)) {
    if (!existsSync(exeSrc)) {
      console.log("Compilando Kai Printers Windows (cross)…");
      run("npm run fetch-sumatra", printServiceRoot);
      run("npm run tauri:build:windows:cross", printServiceRoot);
    }
    run("npm run package:windows-release", printServiceRoot);
  }

  if (!existsSync(zipSrc)) {
    console.error(`No se encontró ZIP Windows: ${zipSrc}`);
    process.exit(1);
  }

  const destName = `kai-printers-windows-${version}-x64-portable.zip`;
  const dest = join(downloadsDir, destName);
  mkdirSync(downloadsDir, { recursive: true });
  removeByPrefix("kai-printers-windows-", ".zip");
  cpSync(zipSrc, dest, { force: true });

  const builtAt = new Date(statSync(dest).mtimeMs).toISOString();
  writeManifest("kai-printers-windows.manifest.json", {
    version,
    filename: destName,
    builtAt,
    format: "zip-portable",
    note: "ZIP portable (KaiPrinters.exe + SumatraPDF.exe). Extraer y ejecutar KaiPrinters.exe.",
  });

  console.log(`Windows → ${dest}`);
  console.log(`URL local: http://localhost:5032/downloads/${destName}`);
}

function findDmgInDir(bundleRoot, version) {
  if (!existsSync(bundleRoot)) return null;
  const dotted = String(version);
  const underscored = dotted.replace(/\./g, "_");
  const candidates = readdirSync(bundleRoot).filter(
    (n) => n.endsWith(".dmg") && (n.includes(underscored) || n.includes(dotted)),
  );
  if (candidates.length === 0) {
    const any = readdirSync(bundleRoot).filter((n) => n.endsWith(".dmg"));
    return any.length ? join(bundleRoot, any.sort().at(-1)) : null;
  }
  return join(bundleRoot, candidates.sort().at(-1));
}

function findMacDmg(version) {
  const fromEnv = process.env.KAI_PRINTERS_DMG_SRC?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;

  const targetRoots = [
    join(printServiceRoot, "src-tauri", "target"),
    process.env.CARGO_TARGET_DIR?.trim(),
  ].filter(Boolean);

  for (const root of targetRoots) {
    const direct = findDmgInDir(join(root, "release", "bundle", "dmg"), version);
    if (direct) return direct;
  }

  // Fallback: buscar bundle/dmg en cualquier subcarpeta target (p. ej. sandbox CI).
  for (const root of targetRoots) {
    if (!existsSync(root)) continue;
    const stack = [root];
    while (stack.length > 0) {
      const dir = stack.pop();
      if (!dir) continue;
      let entries = [];
      try {
        entries = readdirSync(dir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const ent of entries) {
        const full = join(dir, ent.name);
        if (ent.isDirectory()) {
          if (ent.name === "bundle") {
            const dmg = findDmgInDir(join(full, "dmg"), version);
            if (dmg) return dmg;
          }
          if (ent.name !== "node_modules" && ent.name !== ".git") stack.push(full);
        }
      }
    }
  }

  return null;
}

function publishMacos(version) {
  let dmgSrc = findMacDmg(version);
  const distIndex = join(printServiceRoot, "dist", "index.html");

  if (forceBuild || !dmgSrc) {
    console.log("Compilando Kai Printers macOS…");
    run("npm run tauri:build", printServiceRoot);
    dmgSrc = findMacDmg(version);
  }

  if (!dmgSrc || !existsSync(dmgSrc)) {
    console.error("No se encontró .dmg en src-tauri/target/release/bundle/dmg/");
    process.exit(1);
  }

  const dmgMtime = statSync(dmgSrc).mtimeMs;
  if (existsSync(distIndex)) {
    const distMtime = statSync(distIndex).mtimeMs;
    if (dmgMtime + 2000 < distMtime && !forceBuild) {
      console.warn("⚠️  El .dmg parece más antiguo que dist/. Considerá --build.");
    }
  }

  const arch = dmgSrc.includes("aarch64") || process.arch === "arm64" ? "aarch64" : "x64";
  const destName = `kai-printers-macos-${version}-${arch}.dmg`;
  const dest = join(downloadsDir, destName);
  mkdirSync(downloadsDir, { recursive: true });
  removeByPrefix("kai-printers-macos-", ".dmg");
  cpSync(dmgSrc, dest, { force: true });

  const builtAt = new Date(statSync(dest).mtimeMs).toISOString();
  writeManifest("kai-printers-macos.manifest.json", {
    version,
    filename: destName,
    builtAt,
    format: "dmg",
    arch,
    note: "Abrir el .dmg y arrastrar Kai Printers a Aplicaciones.",
  });

  console.log(`macOS → ${dest}`);
  console.log(`URL local: http://localhost:5032/downloads/${destName}`);
}

if (!existsSync(printServiceRoot)) {
  console.error(
    "kai-printers-desktop/ no existe en el monorepo. Cloná o copiá el agente Tauri antes de publicar desktop.",
  );
  process.exit(1);
}

const version = readVersion();
console.log(`Kai Printers desktop v${version} → pwa-pos/public/downloads/`);

if (!macosOnly) publishWindows(version);
if (!windowsOnly) publishMacos(version);

console.log("\n✅ Publicación desktop lista.");
console.log("Commitear solo los manifest JSON (binarios quedan en .gitignore):");
console.log(
  "  git add pwa-pos/public/downloads/kai-printers-windows.manifest.json pwa-pos/public/downloads/kai-printers-macos.manifest.json",
);
