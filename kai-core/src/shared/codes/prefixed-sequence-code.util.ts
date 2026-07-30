/**
 * Códigos de maestro con prefijo + correlativo zero-padded (p. ej. JP00001, UO00042).
 * El usuario nunca asigna ni edita estos códigos; solo el backend.
 */

export function parsePrefixedSequenceCode(
  prefix: string,
  code: string | null | undefined,
): number | null {
  if (!code?.trim() || !prefix.trim()) return null;
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^${escaped}(\\d+)$`, 'i');
  const m = code.trim().match(re);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.floor(n);
}

export function formatPrefixedSequenceCode(
  prefix: string,
  sequence: number,
  pad = 5,
): string {
  const n = Math.max(1, Math.floor(sequence));
  return `${prefix}${String(n).padStart(pad, '0')}`;
}

export function nextPrefixedSequenceCodeFromExisting(
  prefix: string,
  codes: Array<string | null | undefined>,
  pad = 5,
): string {
  let max = 0;
  for (const raw of codes) {
    const seq = parsePrefixedSequenceCode(prefix, raw);
    if (seq != null && seq > max) max = seq;
  }
  return formatPrefixedSequenceCode(prefix, max + 1, pad);
}

/** Prefijos HCM */
export const HR_JOB_POSITION_CODE_PREFIX = 'JP';
export const HR_ORG_UNIT_CODE_PREFIX = 'UO';
export const HR_AFP_FUND_CODE_PREFIX = 'AFP';
export const HR_ISAPRE_CODE_PREFIX = 'ISA';
export const HR_LABOR_UNIT_CODE_PREFIX = 'UL';
export const HR_LABOR_UNIT_SHIFT_CODE_PREFIX = 'ULS';
export const HR_SHIFT_SYSTEM_CODE_PREFIX = 'SS';
