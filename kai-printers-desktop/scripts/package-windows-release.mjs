#!/usr/bin/env node
/**
 * Copia el .exe Windows cross-compilado a kai-printers-desktop/release/windows/
 * y genera un ZIP portable. El instalador NSIS (.exe setup) requiere build en Windows o CI.
 */
import { cpSync, mkdirSync, existsSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const version = JSON.parse(
  readFileSync(join(root, "src-tauri", "tauri.conf.json"), "utf8"),
).version;
const targetRoot =
  process.env.CARGO_TARGET_DIR?.trim() ||
  join(root, "src-tauri", "target");
const exeSrc = join(
  targetRoot,
  "x86_64-pc-windows-msvc",
  "release",
  "print-service.exe",
);
const distIndex = join(root, "dist", "index.html");
const outDir = join(root, "release", "windows");
const exeName = "KaiPrinters.exe";
const sumatraName = "SumatraPDF.exe";
const sumatraSrc = join(root, "src-tauri", "bin", "windows", sumatraName);
const zipName = `KaiPrinters_${version}_x64-portable.zip`;

if (!existsSync(exeSrc)) {
  console.error(
    `No se encontró el ejecutable en:\n  ${exeSrc}\n\nCompila primero:\n` +
      '  export PATH="/opt/homebrew/opt/llvm/bin:$PATH"\n' +
      "  npm run tauri:build:windows:cross\n\n" +
      "En Windows nativo:\n" +
      "  npm run tauri:build",
  );
  process.exit(1);
}

const exeMtime = statSync(exeSrc).mtimeMs;
if (existsSync(distIndex)) {
  const distMtime = statSync(distIndex).mtimeMs;
  if (exeMtime + 2000 < distMtime) {
    console.error(
      `El .exe es más antiguo que dist/ (${exeSrc}).\n` +
        "Volvé a compilar: npm run tauri:build:windows:cross",
    );
    process.exit(1);
  }
}

if (!existsSync(sumatraSrc)) {
  console.error(
    `No se encontró ${sumatraSrc}\n\nEjecutá primero:\n  npm run fetch-sumatra\n`,
  );
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
cpSync(exeSrc, join(outDir, exeName), { force: true });
cpSync(sumatraSrc, join(outDir, sumatraName), { force: true });
console.log(`Copiado desde ${exeSrc}`);
console.log(`Copiado ${sumatraName} para impresión PDF silenciosa`);

const readme = `KaiPrinters ${version} — Windows x64 (portable)

1. Extraé o copiá esta carpeta completa (KaiPrinters.exe y SumatraPDF.exe deben quedar juntos).
2. Impresión de PDF: incluida vía SumatraPDF (sin instalar Ghostscript ni abrir diálogo).
   Opcional: KAI_PRINTERS_SUMATRA=ruta\\SumatraPDF.exe para usar otro ejecutable.
   Licencia SumatraPDF: GPLv3 — ver THIRD_PARTY_NOTICES.md en el repositorio del proyecto.
3. Requisito: Microsoft Edge WebView2 Runtime (suele estar instalado en Windows 10/11).
   Si la app no abre, instala WebView2 desde:
   https://developer.microsoft.com/microsoft-edge/webview2/
4. Primera ejecución: Windows puede mostrar "Windows protegió tu PC" (app sin firma).
   Clic en "Más información" → "Ejecutar de todas formas".
5. Configura en la POS el alias de impresora de tickets (ej. TICKETS) igual que en el agente.
   El nombre de la impresora del sistema en KaiPrinters debe coincidir con el de Windows.

Instalador con asistente (.exe setup):
  Compila en una PC Windows con: npm run tauri:build
  O dispara el workflow GitHub: kai-printers-desktop-release
`;

writeFileSync(join(outDir, "LEEME.txt"), readme, "utf8");

const zipPath = join(outDir, zipName);
execSync(
  `cd "${outDir}" && zip -9 -q -r "${zipName}" "${exeName}" "${sumatraName}" LEEME.txt`,
  { stdio: "inherit" },
);

const nsisSetup = join(
  targetRoot,
  "x86_64-pc-windows-msvc",
  "release",
  "bundle",
  "nsis",
  `KaiPrinters_${version}_x64-setup.exe`,
);
if (existsSync(nsisSetup)) {
  cpSync(nsisSetup, join(outDir, `KaiPrinters_${version}_x64-setup.exe`), {
    force: true,
  });
  console.log("Instalador NSIS copiado.");
}

console.log(`Release Windows en: ${outDir}`);
console.log(`  - ${exeName}`);
console.log(`  - ${sumatraName}`);
console.log(`  - ${zipName}`);
if (!existsSync(nsisSetup)) {
  console.log(
    "  (sin setup.exe — genera en Windows con npm run tauri:build o CI)",
  );
}
