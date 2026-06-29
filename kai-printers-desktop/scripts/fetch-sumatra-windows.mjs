#!/usr/bin/env node
/**
 * Descarga SumatraPDF portable 64-bit y lo deja en src-tauri/bin/windows/SumatraPDF.exe
 * para empaquetado Tauri y ZIP portable.
 */
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { pipeline } from "node:stream/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const VERSION = "3.5.2";
const ZIP_NAME = `SumatraPDF-${VERSION}-64.zip`;
const ZIP_URLS = [
  `https://www.sumatrapdfreader.org/dl/rel/${VERSION}/${ZIP_NAME}`,
  `https://web.archive.org/web/20231101120054/https://www.sumatrapdfreader.org/dl/rel/${VERSION}/${ZIP_NAME}`,
  `https://fossies.org/windows/misc/${ZIP_NAME}`,
];
const ZIP_SHA256 =
  "66ccb395c9184dce6822dfbb9970c877383b3ead6d9417b5106a844aac512989";
const EXE_IN_ZIP = `SumatraPDF-${VERSION}-64.exe`;

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "src-tauri", "bin", "windows");
const outExe = join(outDir, "SumatraPDF.exe");
const tmpZip = join(outDir, `_sumatra-${VERSION}.zip`);
const tmpExtracted = join(outDir, EXE_IN_ZIP);

if (existsSync(outExe) && process.env.FORCE_SUMATRA_FETCH !== "1") {
  console.log(`Ya existe ${outExe} (FORCE_SUMATRA_FETCH=1 para re-descargar).`);
  process.exit(0);
}

function curlDownload(url, dest) {
  try {
    execSync(`curl -fsSL -o "${dest}" "${url}"`, { stdio: "pipe" });
    return;
  } catch {
    execSync(`curl -fsSLk -o "${dest}" "${url}"`, { stdio: "pipe" });
  }
}

async function download(url, dest) {
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    await pipeline(res.body, createWriteStream(dest));
  } catch {
    curlDownload(url, dest);
  }
}

function sha256File(path) {
  const h = createHash("sha256");
  h.update(readFileSync(path));
  return h.digest("hex");
}

mkdirSync(outDir, { recursive: true });
let lastErr;
for (const url of ZIP_URLS) {
  console.log(`Descargando ${url} ...`);
  try {
    await download(url, tmpZip);
    lastErr = null;
    break;
  } catch (e) {
    lastErr = e;
    try {
      unlinkSync(tmpZip);
    } catch {
      /* ignore */
    }
  }
}
if (lastErr) {
  throw lastErr;
}

const hash = sha256File(tmpZip);
if (hash !== ZIP_SHA256) {
  unlinkSync(tmpZip);
  throw new Error(`SHA256 del ZIP no coincide (got ${hash}, expected ${ZIP_SHA256})`);
}

const isWin = process.platform === "win32";
if (isWin) {
  execSync(
    `powershell -NoProfile -Command "Expand-Archive -Path '${tmpZip.replace(/'/g, "''")}' -DestinationPath '${outDir.replace(/'/g, "''")}' -Force"`,
    { stdio: "inherit" },
  );
} else {
  execSync(`unzip -o -j "${tmpZip}" "${EXE_IN_ZIP}" -d "${outDir}"`, {
    stdio: "inherit",
  });
}

if (!existsSync(tmpExtracted)) {
  throw new Error(`No se extrajo ${EXE_IN_ZIP} en ${outDir}`);
}
if (existsSync(outExe)) {
  unlinkSync(outExe);
}
renameSync(tmpExtracted, outExe);
try {
  unlinkSync(tmpZip);
} catch {
  /* ignore */
}

console.log(`Listo: ${outExe}`);
