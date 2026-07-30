/**
 * RUT empresas/personas Chile: formato almacenado `xx.xxx.xxx-d` (d dígito o K) y verificación módulo 11.
 */
const RUT_STRIP = /^(\d{1,2})\.(\d{3})\.(\d{3})-([\dkK])$/;

export function isValidChileRutFormat(rut: string): boolean {
  const t = String(rut || '').trim();
  const m = t.match(RUT_STRIP);
  if (!m) {
    return false;
  }
  const [, a, b, c, dvIn] = m;
  const body = `${a}${b}${c}`;
  const expected = chileRutCheckDigitFromBody(body);
  return dvIn.toUpperCase() === expected;
}

function chileRutCheckDigitFromBody(body: string): string {
  let sum = 0;
  let mult = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    const n = parseInt(body[i]!, 10);
    if (Number.isNaN(n)) {
      return '-';
    }
    sum += n * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const rest = 11 - (sum % 11);
  if (rest === 11) {
    return '0';
  }
  if (rest === 10) {
    return 'K';
  }
  return String(rest);
}

export function assertValidChileCompanyRut(rut: string, context: string): void {
  if (!isValidChileRutFormat(rut)) {
    throw new Error(`${context}: RUT chileno inválido. Use formato xx.xxx.xxx-d (d dígito o K). Valor: ${rut}`);
  }
}
