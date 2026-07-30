/**
 * Heurísticas para pistola lectora / escaneo en el buscador POS.
 * La pistola escribe rápido un código (EAN, SKU) y suele terminar con Enter.
 */

/**
 * Código escaneado típico: un solo token, sin espacios.
 * @param minLength En auto-búsqueda (debounce) usar ≥8 para no disparar con prefijos parciales.
 */
export function looksLikeBarcodeScan(query: string, minLength = 4): boolean {
  const q = query.trim();
  if (q.length < minLength || q.length > 32) return false;
  if (/\s/.test(q)) return false;
  return /^[0-9A-Za-z._/-]+$/.test(q);
}

/** ¿Agregar automáticamente al carrito tras la búsqueda? */
export function shouldAutoAddSingleResult(options: {
  total: number;
  itemCount: number;
  page: number;
  scanIntent: boolean;
}): boolean {
  const { total, itemCount, page, scanIntent } = options;
  if (!scanIntent || page !== 1) return false;
  return total === 1 && itemCount === 1;
}
