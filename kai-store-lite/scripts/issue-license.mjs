/**
 * Emisión manual de licencia KaiStore Lite (Ed25519).
 *
 * Uso:
 *   LITE_LICENSE_PRIVATE_KEY_HEX=<64-byte hex> \\
 *     node scripts/issue-license.mjs \\
 *       --fingerprint <hex> \\
 *       --company "Mi Tienda" \\
 *       --out license.json
 *
 * Sin clave privada (dev): escribe payload sin firma válida; Rust acepta
 * pubkey cero (DEFAULT) saltándose verify criptográfico pero exige fingerprint.
 *
 * Ver issue-license.keys.example.md
 */
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { createPrivateKey, sign } from "node:crypto";

const { values } = parseArgs({
  options: {
    fingerprint: { type: "string" },
    company: { type: "string", default: "KaiStore Lite" },
    out: { type: "string", default: "license.json" },
    expires: { type: "string" },
  },
});

if (!values.fingerprint) {
  console.error("Required: --fingerprint <machine fingerprint hex>");
  process.exit(1);
}

const payload = {
  product: "kaistore-lite",
  companyName: values.company,
  fingerprint: values.fingerprint,
  issuedAt: new Date().toISOString(),
  expiresAt: values.expires ?? null,
  perpetual: !values.expires,
};

const msg = Buffer.from(JSON.stringify(payload), "utf8");
const privHex = process.env.LITE_LICENSE_PRIVATE_KEY_HEX?.trim();

let signature = "DEV_UNSIGNED";
if (privHex) {
  // Expect 32-byte seed hex for ed25519; node crypto wants PKCS8 — use raw sign via tweetnacl-like
  // For MVP: store base64 of HMAC-less placeholder when key present but format unknown.
  try {
    const seed = Buffer.from(privHex, "hex");
    if (seed.length === 32) {
      // Build a minimal PKCS8 for Ed25519 private key
      const pkcs8 = Buffer.concat([
        Buffer.from("302e020100300506032b657004220420", "hex"),
        seed,
      ]);
      const key = createPrivateKey({ key: pkcs8, format: "der", type: "pkcs8" });
      signature = sign(null, msg, key).toString("base64");
    } else {
      console.warn("LITE_LICENSE_PRIVATE_KEY_HEX must be 32-byte seed; using DEV_UNSIGNED");
    }
  } catch (e) {
    console.warn("sign failed, DEV_UNSIGNED:", e);
  }
}

const license = { payload, signature };
const outPath = path.resolve(values.out);
fs.writeFileSync(outPath, JSON.stringify(license, null, 2) + "\n");
console.log(`Wrote ${outPath}`);
console.log(`Fingerprint: ${values.fingerprint}`);
