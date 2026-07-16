export type ParsedSiiStcActivity = {
  name: string;
  code: string;
  categoryRaw: string;
  ivaAffected: boolean;
};

export type ParsedSiiStcResult = {
  legalName: string;
  activityStarted: boolean;
  activityStartDate: string | null;
  smallBusiness: string | null;
  foreignCurrencyAuth: string | null;
  activities: ParsedSiiStcActivity[];
  warnings: string[];
};

function decodeHtmlEntities(text: string): string {
  const named: Record<string, string> = {
    nbsp: ' ',
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    ntilde: 'ñ',
    Ntilde: 'Ñ',
    deg: '°',
    uacute: 'ú',
    Uacute: 'Ú',
    aacute: 'á',
    Aacute: 'Á',
    eacute: 'é',
    Eacute: 'É',
    iacute: 'í',
    Iacute: 'Í',
    oacute: 'ó',
    Oacute: 'Ó',
    uuml: 'ü',
    Uuml: 'Ü',
  };
  let out = text
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&([a-zA-Z]+);/g, (match, name: string) => named[name] ?? match);
  return out.replace(/\s+/g, ' ').trim();
}

function stripScriptsAndStyles(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');
}

function isPlausibleLegalName(text: string): boolean {
  const t = text.trim();
  if (t.length < 3 || t.length > 220) return false;
  if (/^\/\*|\*\/|^[\s{}#;:./\\-]+$/.test(t)) return false;
  if (/consultar|situaci[oó]n tributaria|servicio de impuestos|ingrese rut|efectuar consulta/i.test(t)) {
    return false;
  }
  if (/contribuyente presenta|fecha de inicio|empresa de menor|documentos timbrados/i.test(t)) {
    return false;
  }
  if (!/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(t)) return false;
  return true;
}

function extractLegalName(html: string): string {
  const clean = stripScriptsAndStyles(html);

  const bodyMatch = clean.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const body = bodyMatch?.[1] ?? clean;
  const outerDiv = body.match(/<div[^>]*>([\s\S]*)<\/div>/i);
  if (outerDiv?.[1]) {
    const innerDivs = [...outerDiv[1].matchAll(/<div[^>]*>([\s\S]*?)<\/div>/gi)];
    if (innerDivs.length >= 4) {
      const fromFourth = stripTags(innerDivs[3][1]);
      if (isPlausibleLegalName(fromFourth)) return fromFourth;
    }
  }

  const fonts = [...clean.matchAll(/<font[^>]*>([^<]{4,220})<\/font>/gi)]
    .map((m) => decodeHtmlEntities(m[1].trim()))
    .filter(isPlausibleLegalName);
  if (fonts.length > 0) return fonts[0];

  const divBlocks = [...clean.matchAll(/<div[^>]*>([\s\S]*?)<\/div>/gi)]
    .map((m) => stripTags(m[1]))
    .filter(isPlausibleLegalName);
  if (divBlocks.length > 0) return divBlocks[0];

  throw new Error('No se encontró razón social en la respuesta del SII');
}

function extractAfterLabel(html: string, label: string): string | null {
  const idx = html.indexOf(label);
  if (idx < 0) return null;
  const slice = html.slice(idx);
  const sameTag = slice.match(
    new RegExp(`${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:?\\s*([^<\\n]+)`, 'i'),
  );
  if (sameTag?.[1]) {
    return decodeHtmlEntities(sameTag[1]);
  }
  const tail = slice.slice(label.length);
  const colon = tail.indexOf(':');
  const afterColon = colon >= 0 ? tail.slice(colon + 1) : tail;
  const fontMatch = afterColon.match(/<font[^>]*>([^<]*)<\/font>/i);
  if (fontMatch?.[1]) {
    return decodeHtmlEntities(fontMatch[1]);
  }
  const textMatch = afterColon.match(/>\s*([^<]+?)\s*</);
  if (textMatch?.[1]) {
    return decodeHtmlEntities(textMatch[1]);
  }
  return decodeHtmlEntities(stripTags(afterColon).slice(0, 120));
}

function stripTags(fragment: string): string {
  return decodeHtmlEntities(fragment.replace(/<[^>]+>/g, ' '));
}

function parseYesNo(value: string | null): boolean {
  if (!value) return false;
  const u = value.trim().toUpperCase();
  return u === 'SI' || u === 'SÍ' || u.startsWith('SI ');
}

function parseActivities(html: string): ParsedSiiStcActivity[] {
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const activities: ParsedSiiStcActivity[] = [];
  for (const row of rows) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) =>
      stripTags(c[1]),
    );
    if (cells.length < 4) continue;
    const codeRaw = cells[1]?.replace(/\D/g, '') ?? '';
    if (!/^\d{5,6}$/.test(codeRaw)) continue;
    const name = cells[0]?.trim();
    if (!name || /giro|actividad/i.test(name)) continue;
    activities.push({
      name,
      code: codeRaw.padStart(6, '0'),
      categoryRaw: cells[2]?.trim() ?? '',
      ivaAffected: /^si$/i.test(cells[3]?.trim() ?? ''),
    });
  }
  return activities;
}

function extractWarnings(html: string): string[] {
  const warnings: string[] = [];
  const obsIdx = html.indexOf('Observaciones');
  if (obsIdx >= 0) {
    const chunk = html.slice(obsIdx, obsIdx + 4000);
    const lines = stripTags(chunk)
      .split(/\n|\. /)
      .map((l) => l.trim())
      .filter((l) => l.length > 10 && !/^observaciones/i.test(l));
    warnings.push(...lines.slice(0, 5));
  }
  return warnings;
}

export function parseSiiStcHtml(html: string): ParsedSiiStcResult {
  if (/rut\s+no\s+registrado|rut\s+inv[aá]lido|no\s+existen\s+datos/i.test(html)) {
    throw new Error('RUT no registrado en el SII o sin datos disponibles');
  }

  const legalName = extractLegalName(html);
  const inicioRaw = extractAfterLabel(
    html,
    'Contribuyente presenta Inicio de Actividades',
  );
  const fechaInicio = extractAfterLabel(html, 'Fecha de Inicio de Actividades');

  return {
    legalName,
    activityStarted: parseYesNo(inicioRaw),
    activityStartDate: fechaInicio?.trim() || null,
    smallBusiness: null,
    foreignCurrencyAuth: null,
    activities: parseActivities(html),
    warnings: extractWarnings(html),
  };
}
