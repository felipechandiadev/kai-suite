import { XMLParser } from 'fast-xml-parser';

export type ParsedCaf = {
  rangeFrom: number;
  rangeTo: number;
  dteType: number;
  rawXml: string;
};

export type ParsedSiiResponse = {
  estado: string | null;
  glosa: string | null;
  token: string | null;
  semilla: string | null;
};

function coerceXmlText(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

/** Busca la primera clave local (sin namespace) en el árbol XML parseado. */
function findFirstXmlValue(obj: unknown, localName: string): unknown {
  if (obj == null || typeof obj !== 'object') return undefined;
  const target = localName.toUpperCase();
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findFirstXmlValue(item, localName);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  const record = obj as Record<string, unknown>;
  for (const [key, value] of Object.entries(record)) {
    if (key.startsWith('@_') || key === '?xml') continue;
    const local = key.includes(':') ? key.split(':').pop()! : key;
    if (local.toUpperCase() === target) return value;
  }
  for (const value of Object.values(record)) {
    if (value != null && typeof value === 'object') {
      const found = findFirstXmlValue(value, localName);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

function extractTagText(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, 'i'));
  return m?.[1]?.trim() ?? null;
}

export function parseSiiResponseXml(xml: string): ParsedSiiResponse {
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: false,
  });
  const doc = parser.parse(xml);
  return {
    estado:
      coerceXmlText(findFirstXmlValue(doc, 'ESTADO')) ??
      coerceXmlText(extractTagText(xml, 'ESTADO')),
    glosa:
      coerceXmlText(findFirstXmlValue(doc, 'GLOSA')) ??
      coerceXmlText(extractTagText(xml, 'GLOSA')),
    token:
      coerceXmlText(findFirstXmlValue(doc, 'TOKEN')) ??
      coerceXmlText(extractTagText(xml, 'TOKEN')),
    semilla:
      coerceXmlText(findFirstXmlValue(doc, 'SEMILLA')) ??
      coerceXmlText(extractTagText(xml, 'SEMILLA')),
  };
}

function formatSiiRejection(parsed: ParsedSiiResponse, context: string): string {
  if (parsed.estado && parsed.estado !== '00') {
    const glosa = parsed.glosa ? `: ${parsed.glosa}` : '';
    return `SII rechazó ${context} (ESTADO ${parsed.estado}${glosa})`;
  }
  if (parsed.glosa) {
    return `SII rechazó ${context}: ${parsed.glosa}`;
  }
  return `No se pudo leer respuesta del SII (${context})`;
}

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
  const parsed = parseSiiResponseXml(xml);
  if (parsed.semilla) return parsed.semilla;
  throw new Error(formatSiiRejection(parsed, 'semilla'));
}

export function extractTokenFromResponseXml(xml: string): string {
  const parsed = parseSiiResponseXml(xml);
  if (parsed.token) return parsed.token.trim();
  throw new Error(formatSiiRejection(parsed, 'token'));
}

function readTokenFromSetCookieHeader(setCookie: string): string | null {
  const m = setCookie.match(/(?:^|,\s*)TOKEN=([^;,\s]+)/i);
  return m?.[1]?.trim() ?? null;
}

/** Prefiere TOKEN de Set-Cookie (sesión SII); fallback al cuerpo XML. */
export function extractSiiAuthToken(response: Pick<Response, 'headers'>, bodyXml: string): string {
  const getSetCookie = response.headers.getSetCookie?.bind(response.headers);
  if (getSetCookie) {
    for (const cookie of getSetCookie()) {
      const token = readTokenFromSetCookieHeader(cookie);
      if (token) return token;
    }
  }
  const raw = response.headers.get('set-cookie');
  if (raw) {
    const token = readTokenFromSetCookieHeader(raw);
    if (token) return token;
  }
  return extractTokenFromResponseXml(bodyXml);
}

function readJsonField(body: string, keys: string[]): unknown {
  const trimmed = body.trim();
  if (!trimmed.startsWith('{')) return undefined;
  try {
    const data = JSON.parse(trimmed) as Record<string, unknown>;
    for (const key of keys) {
      if (data[key] != null) return data[key];
      const found = Object.entries(data).find(
        ([k]) => k.toLowerCase() === key.toLowerCase(),
      );
      if (found) return found[1];
    }
  } catch {
    return undefined;
  }
  return undefined;
}

/** Respuesta POST /boleta.electronica.envio — OpenAPI devuelve JSON (trackid numérico). */
export function extractTrackIdFromEnvioResponse(body: string): string | null {
  const fromJson = readJsonField(body, ['trackid', 'trackId', 'TRACKID']);
  if (fromJson != null) {
    const value = String(fromJson).trim();
    if (value) return value;
  }
  const m =
    body.match(/<TRACKID>([^<]+)<\/TRACKID>/i) ??
    body.match(/<TRACK_ID>([^<]+)<\/TRACK_ID>/i);
  return m?.[1]?.trim() ?? null;
}

/** Respuesta GET estado de envío — JSON o XML. */
export function extractEstadoFromEnvioStatusResponse(body: string): string {
  const fromJson = readJsonField(body, ['estado', 'ESTADO']);
  if (typeof fromJson === 'string' && fromJson.trim()) {
    return fromJson.trim();
  }
  return body.match(/<ESTADO>([^<]+)<\/ESTADO>/i)?.[1]?.trim() ?? 'UNKNOWN';
}

export type SiiEnvioRechazoDetalle = {
  folio: number | null;
  descripcion: string | null;
  errors: string[];
};

export function extractRechazoFromEnvioStatusResponse(body: string): SiiEnvioRechazoDetalle | null {
  const trimmed = body.trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    const data = JSON.parse(trimmed) as Record<string, unknown>;
    const detalle = data.detalle_rep_rech;
    if (!Array.isArray(detalle) || detalle.length === 0) return null;
    const first = detalle[0] as Record<string, unknown>;
    const errors: string[] = [];
    if (Array.isArray(first.error)) {
      for (const err of first.error) {
        const o = err as Record<string, unknown>;
        const parts = [o.descripcion, o.detalle].filter((x) => typeof x === 'string' && x.trim());
        if (parts.length) errors.push(parts.join(': '));
      }
    }
    return {
      folio: first.folio != null ? Number(first.folio) : null,
      descripcion: typeof first.descripcion === 'string' ? first.descripcion : null,
      errors,
    };
  } catch {
    return null;
  }
}

export function splitRut(rut: string): { body: string; dv: string } {
  const clean = rut.replace(/\./g, '').trim();
  const parts = clean.split('-');
  if (parts.length !== 2) {
    throw new Error(`RUT inválido: ${rut}`);
  }
  return { body: parts[0], dv: parts[1].toUpperCase() };
}
