/**
 * Normaliza número de documento para comparar unicidad (ignora puntos, guiones y espacios).
 */
export function normalizePersonDocumentNumber(
  raw: string | null | undefined,
): string {
  if (raw == null || typeof raw !== 'string') {
    return '';
  }
  return raw.replace(/[.\-\s_]/g, '').toLowerCase();
}
