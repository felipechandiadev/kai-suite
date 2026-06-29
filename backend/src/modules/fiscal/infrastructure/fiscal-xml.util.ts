import { XMLParser } from 'fast-xml-parser';

export type ParsedCaf = {
  rangeFrom: number;
  rangeTo: number;
  dteType: number;
  rawXml: string;
};

export function parseCafXml(xml: string): ParsedCaf {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });
  const doc = parser.parse(xml);
  const autorizacion = doc?.AUTORIZACION ?? doc?.autorizacion;
  const caf = autorizacion?.CAF ?? autorizacion?.caf;
  const da = caf?.DA ?? caf?.da;
  if (!da) {
    throw new Error('CAF inválido: no se encontró nodo DA');
  }
  const rangeFrom = Number(da.RNG?.D ?? da.rng?.d ?? da['RNG']?.['D']);
  const rangeTo = Number(da.RNG?.H ?? da.rng?.h ?? da['RNG']?.['H']);
  const dteType = Number(da.TD ?? da.td ?? 39);
  if (!Number.isFinite(rangeFrom) || !Number.isFinite(rangeTo)) {
    throw new Error('CAF inválido: rango de folios no legible');
  }
  return { rangeFrom, rangeTo, dteType, rawXml: xml };
}

export function extractSeedFromSemillaXml(xml: string): string {
  const parser = new XMLParser({ ignoreAttributes: false });
  const doc = parser.parse(xml);
  const seed =
    doc?.RESPUESTA?.SEMILLA ??
    doc?.respuesta?.semilla ??
    doc?.SEMILLA ??
    doc?.semilla;
  if (!seed || typeof seed !== 'string') {
    throw new Error('No se pudo leer SEMILLA del XML SII');
  }
  return seed.trim();
}

export function extractTokenFromResponseXml(xml: string): string {
  const parser = new XMLParser({ ignoreAttributes: false });
  const doc = parser.parse(xml);
  const token =
    doc?.RESPUESTA?.TOKEN ??
    doc?.respuesta?.token ??
    doc?.TOKEN ??
    doc?.token;
  if (!token || typeof token !== 'string') {
    throw new Error('No se pudo leer TOKEN del XML SII');
  }
  return token.trim();
}

export function splitRut(rut: string): { body: string; dv: string } {
  const clean = rut.replace(/\./g, '').trim();
  const parts = clean.split('-');
  if (parts.length !== 2) {
    throw new Error(`RUT inválido: ${rut}`);
  }
  return { body: parts[0], dv: parts[1].toUpperCase() };
}
