/** Prefijo: Centro de Efectivo (centro de acopio). */
export const CASH_HUB_CODE_PREFIX = 'CEV';

const CASH_HUB_CODE_PATTERN = /^CEV(\d+)$/i;

/** Extrae el correlativo numérico de un código `CEV00042`, o null si no aplica. */
export function parseCashHubCodeSequence(code: string | null | undefined): number | null {
  if (!code?.trim()) {
    return null;
  }
  const m = code.trim().match(CASH_HUB_CODE_PATTERN);
  if (!m) {
    return null;
  }
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 1) {
    return null;
  }
  return Math.floor(n);
}

export function formatCashHubCode(sequence: number, pad = 5): string {
  const n = Math.max(1, Math.floor(sequence));
  return `${CASH_HUB_CODE_PREFIX}${String(n).padStart(pad, '0')}`;
}

/** Siguiente código libre según los existentes con prefijo CEV. */
export function nextCashHubCodeFromExisting(
  codes: Array<string | null | undefined>,
): string {
  let max = 0;
  for (const raw of codes) {
    const seq = parseCashHubCodeSequence(raw);
    if (seq != null && seq > max) {
      max = seq;
    }
  }
  return formatCashHubCode(max + 1);
}
