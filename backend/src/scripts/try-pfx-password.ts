#!/usr/bin/env ts-node
/**
 * Prueba contraseñas de un certificado .pfx (misma lógica que SiiBoletaAuthService).
 *
 * Uso:
 *   cd backend && npm run fiscal:try-pfx-password -- ../envs/certs/10708387-1.pfx 'Marce-1070'
 *   cd backend && npm run fiscal:try-pfx-password -- ../envs/certs/10708387-1.pfx 'pass1' 'pass2'
 *   cd backend && npm run fiscal:try-pfx-password -- ../envs/certs/10708387-1.pfx --variations 'Marce-1070'
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as forge from 'node-forge';

type TryResult =
  | { ok: true; subject: string; notBefore: Date; notAfter: Date; rut: string | null }
  | { ok: false; error: string };

function extractRutFromSubject(subject: string): string | null {
  const m = subject.match(/\b(\d{1,2}\.?\d{3}\.?\d{3}-[\dkK])\b/i);
  return m?.[1] ?? null;
}

function tryPfxPassword(pfxBuffer: Buffer, password: string): TryResult {
  try {
    const asn1 = forge.asn1.fromDer(
      forge.util.createBuffer(pfxBuffer.toString('binary')),
    );
    const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, password);
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const certBag = certBags[forge.pki.oids.certBag]?.[0];
    const keyBag =
      keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0] ??
      p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag]?.[0];
    if (!certBag?.cert || !keyBag?.key) {
      return { ok: false, error: 'PFX abierto pero sin certificado o llave privada' };
    }
    const cert = certBag.cert as forge.pki.Certificate;
    const subject = cert.subject.attributes
      .map((a) => `${a.shortName ?? a.name}=${String(a.value)}`)
      .join(', ');
    return {
      ok: true,
      subject,
      notBefore: cert.validity.notBefore,
      notAfter: cert.validity.notAfter,
      rut: extractRutFromSubject(subject),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/password|mac verify|decrypt/i.test(msg)) {
      return { ok: false, error: 'contraseña incorrecta' };
    }
    return { ok: false, error: msg };
  }
}

/** Variaciones típicas alrededor de una contraseña candidata. */
function passwordVariations(base: string): string[] {
  const trimmed = base.trim();
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (s: string) => {
    if (!s || seen.has(s)) return;
    seen.add(s);
    out.push(s);
  };

  add(trimmed);
  add(trimmed.toLowerCase());
  add(trimmed.toUpperCase());
  add(trimmed.replace(/-/g, ''));
  add(trimmed.replace(/-/g, '_'));

  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  add(capitalized);

  const digits = trimmed.replace(/\D/g, '');
  if (digits) {
    add(digits);
    const namePart = trimmed.replace(/[\d-]/g, '').replace(/-$/, '');
    if (namePart) {
      add(`${namePart}-${digits}`);
      add(`${namePart}${digits}`);
      add(`${namePart.charAt(0).toUpperCase()}${namePart.slice(1).toLowerCase()}-${digits}`);
    }
  }

  return out;
}

function printResult(password: string, result: TryResult): void {
  if (!result.ok) {
    console.log(`✗  "${password}" — ${result.error}`);
    return;
  }
  console.log(`✓  "${password}" — OK`);
  console.log(`   Sujeto: ${result.subject}`);
  if (result.rut) console.log(`   RUT:    ${result.rut}`);
  console.log(
    `   Vigencia: ${result.notBefore.toISOString().slice(0, 10)} → ${result.notAfter.toISOString().slice(0, 10)}`,
  );
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.length < 2 || args.includes('--help') || args.includes('-h')) {
    console.log(`Uso: npm run fiscal:try-pfx-password -- <archivo.pfx> <contraseña> [más…]
      npm run fiscal:try-pfx-password -- <archivo.pfx> --variations <base>`);
    process.exit(args.includes('--help') || args.includes('-h') ? 0 : 1);
  }

  const pfxPath = path.resolve(args[0]);
  if (!fs.existsSync(pfxPath)) {
    console.error(`No existe: ${pfxPath}`);
    process.exit(1);
  }

  const pfxBuffer = fs.readFileSync(pfxPath);
  let passwords: string[];

  const varIdx = args.indexOf('--variations');
  if (varIdx >= 0) {
    const base = args[varIdx + 1];
    if (!base) {
      console.error('Falta valor después de --variations');
      process.exit(1);
    }
    passwords = passwordVariations(base);
    console.log(`Probando ${passwords.length} variaciones de "${base}" en ${pfxPath}\n`);
  } else {
    passwords = args.slice(1);
    console.log(`Probando ${passwords.length} contraseña(s) en ${pfxPath}\n`);
  }

  let found = 0;
  for (const pass of passwords) {
    const result = tryPfxPassword(pfxBuffer, pass);
    printResult(pass, result);
    if (result.ok) found += 1;
  }

  console.log(found > 0 ? `\n${found} contraseña(s) válida(s).` : '\nNinguna contraseña válida.');
  process.exit(found > 0 ? 0 : 1);
}

main();
