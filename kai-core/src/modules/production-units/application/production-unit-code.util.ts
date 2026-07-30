/** Prefijo: Unidad de PRoducción. */
export const PRODUCTION_UNIT_CODE_PREFIX = 'UPR';

const PRODUCTION_UNIT_CODE_PATTERN = /^UPR(\d+)$/i;

/** Extrae el correlativo numérico de un código `UPR00042`, o null si no aplica. */
export function parseProductionUnitCodeSequence(
  code: string | null | undefined,
): number | null {
  if (!code?.trim()) {
    return null;
  }
  const m = code.trim().match(PRODUCTION_UNIT_CODE_PATTERN);
  if (!m) {
    return null;
  }
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 1) {
    return null;
  }
  return Math.floor(n);
}

export function formatProductionUnitCode(sequence: number, pad = 5): string {
  const n = Math.max(1, Math.floor(sequence));
  return `${PRODUCTION_UNIT_CODE_PREFIX}${String(n).padStart(pad, '0')}`;
}

/** Siguiente código libre según los existentes con prefijo UPR. */
export function nextProductionUnitCodeFromExisting(
  codes: Array<string | null | undefined>,
): string {
  let max = 0;
  for (const raw of codes) {
    const seq = parseProductionUnitCodeSequence(raw);
    if (seq != null && seq > max) {
      max = seq;
    }
  }
  return formatProductionUnitCode(max + 1);
}
