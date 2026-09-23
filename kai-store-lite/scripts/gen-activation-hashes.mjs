#!/usr/bin/env node
/**
 * Genera / regenera hashes de activación Lite.
 *
 * Uso:
 *   node scripts/gen-activation-hashes.mjs           # regenera hashes desde JSON existente
 *   node scripts/gen-activation-hashes.mjs --fresh   # crea 20 códigos nuevos + hashes
 *
 * Entrada:  license-codes/activation-codes.json  (códigos en claro — NO van al binario)
 * Salida:   src-tauri/src/license/activation_hashes.rs
 *
 * En cada release: editá el JSON (o --fresh) y corré este script antes del build.
 */
import { createHash, randomInt } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const jsonPath = join(root, "license-codes", "activation-codes.json");
const rustPath = join(root, "src-tauri", "src", "license", "activation_hashes.rs");

/** Debe coincidir con ACTIVATION_SALT en Rust. */
export const ACTIVATION_SALT = "kai-store-lite-v1-activation";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function normalizeCode(raw) {
  return String(raw ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function hashCode(code) {
  const n = normalizeCode(code);
  return createHash("sha256")
    .update(ACTIVATION_SALT + n, "utf8")
    .digest("hex");
}

function randomCode() {
  // XXXX-XXXX
  let s = "";
  for (let i = 0; i < 8; i++) {
    s += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

function generateFreshCodes(count = 20) {
  const set = new Set();
  while (set.size < count) {
    set.add(randomCode());
  }
  return [...set];
}

function writeJson(codes, version) {
  mkdirSync(dirname(jsonPath), { recursive: true });
  const doc = {
    version,
    note: "Códigos en claro para soporte. NO incluir este archivo en el instalador. Tras editar, correr: npm run gen:activation-hashes",
    generatedAt: new Date().toISOString(),
    codes,
  };
  writeFileSync(jsonPath, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
}

function writeRust(hashes, version) {
  const lines = hashes.map((h) => `    "${h}",`).join("\n");
  const src = `//! Autogenerado por \`scripts/gen-activation-hashes.mjs\` — no editar a mano.
//! Versión de lista: ${version}
//! Salt embebido; los códigos en claro viven en license-codes/activation-codes.json

/// Debe coincidir con ACTIVATION_SALT del script Node.
pub const ACTIVATION_SALT: &str = "${ACTIVATION_SALT}";

/// SHA-256 hex de (salt + código normalizado).
pub const ACTIVATION_CODE_HASHES: &[&str] = &[
${lines}
];
`;
  writeFileSync(rustPath, src, "utf8");
}

function main() {
  const fresh = process.argv.includes("--fresh");
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const version = pkg.version ?? "0.0.0";

  let codes;
  if (fresh || !existsSync(jsonPath)) {
    codes = generateFreshCodes(20);
    writeJson(codes, version);
    console.log(`Wrote ${codes.length} codes → ${jsonPath}`);
  } else {
    const doc = JSON.parse(readFileSync(jsonPath, "utf8"));
    codes = Array.isArray(doc.codes) ? doc.codes : [];
    if (codes.length === 0) {
      console.error("activation-codes.json no tiene codes[]");
      process.exit(1);
    }
    // refresh metadata timestamp / version stamp without changing codes
    writeJson(codes, doc.version ?? version);
  }

  const normalized = codes.map(normalizeCode);
  const uniq = new Set(normalized);
  if (uniq.size !== normalized.length) {
    console.error("Hay códigos duplicados (tras normalizar).");
    process.exit(1);
  }

  const hashes = normalized.map(hashCode);
  writeRust(hashes, version);
  console.log(`Wrote ${hashes.length} hashes → ${rustPath}`);
}

main();
