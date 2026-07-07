import * as forge from 'node-forge';

export type CafSigningMaterial = {
  /** Bloque XML `<CAF …>…</CAF>` tal como viene en el archivo SII */
  cafBlockXml: string;
  privateKeyPem: string;
};

export type BuildTedInput = {
  rutEmisor: string;
  tipoDte: number;
  folio: number;
  fechaEmision: string;
  rutReceptor: string;
  razonSocialReceptor: string;
  mntTotal: number;
  primerItem: string;
  cafXml: string;
  timestamp?: string;
};

function trim40(value: string): string {
  return value.trim().slice(0, 40);
}

function formatRut(rut: string): string {
  return rut.replace(/\./g, '').trim();
}

function isoTimestamp(): string {
  return new Date().toISOString().slice(0, 19);
}

/** Codifica string como latin1 para SHA1withRSA (Node Buffer o fallback browser). */
function latin1BinaryString(value: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'latin1').toString('binary');
  }
  const bytes = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i++) {
    bytes[i] = value.charCodeAt(i) & 0xff;
  }
  return String.fromCharCode(...bytes);
}

/** Extrae bloque CAF firmado y llave privada PEM del archivo AUTORIZACION. */
export function extractCafSigningMaterial(cafXml: string): CafSigningMaterial {
  const cafMatch = cafXml.match(/<CAF\b[^>]*>[\s\S]*?<\/CAF>/i);
  if (!cafMatch) {
    throw new Error('CAF inválido: no se encontró nodo CAF');
  }
  const rsaskMatch = cafXml.match(/<RSASK>([\s\S]*?)<\/RSASK>/i);
  if (!rsaskMatch) {
    throw new Error('CAF inválido: no se encontró RSASK');
  }
  const privateKeyPem = rsaskMatch[1].replace(/\t/g, '').trim();
  if (!privateKeyPem.includes('BEGIN RSA PRIVATE KEY')) {
    throw new Error('CAF inválido: RSASK no es PEM RSA');
  }
  return {
    cafBlockXml: cafMatch[0].replace(/\r?\n/g, '').replace(/>\s+</g, '><'),
    privateKeyPem,
  };
}

/** Firma el XML del nodo DD con SHA1withRSA (llave del CAF). */
export function signTedDd(ddXml: string, privateKeyPem: string): string {
  const key = forge.pki.privateKeyFromPem(privateKeyPem);
  const md = forge.md.sha1.create();
  md.update(latin1BinaryString(ddXml));
  return forge.util.encode64(key.sign(md));
}

/** Construye TED completo (DD + FRMT) listo para insertar en el Documento. */
export function buildTedStamp(input: BuildTedInput): string {
  const { cafBlockXml, privateKeyPem } = extractCafSigningMaterial(input.cafXml);
  const ts = input.timestamp ?? isoTimestamp();
  const ddXml =
    `<DD>` +
    `<RE>${formatRut(input.rutEmisor)}</RE>` +
    `<TD>${input.tipoDte}</TD>` +
    `<F>${input.folio}</F>` +
    `<FE>${input.fechaEmision}</FE>` +
    `<RR>${formatRut(input.rutReceptor)}</RR>` +
    `<RSR>${trim40(input.razonSocialReceptor)}</RSR>` +
    `<MNT>${input.mntTotal}</MNT>` +
    `<IT1>${trim40(input.primerItem)}</IT1>` +
    cafBlockXml +
    `<TSTED>${ts}</TSTED>` +
    `</DD>`;
  const frmt = signTedDd(ddXml, privateKeyPem);
  return `<TED version="1.0">${ddXml}<FRMT algoritmo="SHA1withRSA">${frmt}</FRMT></TED>`;
}
