/** Entrada/salida CLP para TextField `type="currency"` (solo dígitos en estado). */

export function digitsFromClp(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "";
  return String(Math.max(0, Math.round(Number(n))));
}

export function parseClpDigitsFromValue(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return 0;
  return Number(digits);
}

export function parseClpDigitsNullableFromValue(raw: string): number | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  return Number(digits);
}
