export type ParsedChileRut = {
  body: string;
  dv: string;
  formatted: string;
};

function computeRutDv(body: string): string {
  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i -= 1) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  if (remainder === 11) return '0';
  if (remainder === 10) return 'K';
  return String(remainder);
}

export function parseChileRut(raw: string): ParsedChileRut | null {
  const clean = raw.replace(/\./g, '').replace(/\s/g, '').toUpperCase();
  const match = clean.match(/^(\d{7,8})-?([\dK])$/);
  if (!match) return null;
  const body = match[1];
  const dv = match[2];
  const formatted = `${body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`;
  return { body, dv, formatted };
}

export function isValidChileRut(raw: string): boolean {
  const parsed = parseChileRut(raw);
  if (!parsed) return false;
  return computeRutDv(parsed.body) === parsed.dv;
}

export function formatRutBodyDvForSii(raw: string): { rut: string; dv: string } {
  const parsed = parseChileRut(raw);
  if (!parsed || !isValidChileRut(raw)) {
    throw new Error(`RUT inválido: ${raw}`);
  }
  return { rut: parsed.body, dv: parsed.dv };
}
