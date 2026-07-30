/**
 * Pliegue de mayúsculas / tildes (español común) para coincidir con `translate`/`REPLACE` en SQL.
 * Sin extensiones de BD: mismo mapa en TS y en columnas.
 */
const FOLD_FROM = 'áéíóúñüÁÉÍÓÚÑÜ';
const FOLD_TO = 'aeiounuaeiounu';

/** Expresión PostgreSQL: lower(translate(col, ...)) */
export const PG_PURCHASING_SEARCH_TRANSLATE_FROM = FOLD_FROM;
export const PG_PURCHASING_SEARCH_TRANSLATE_TO = FOLD_TO;

export function foldPurchasingSearchText(raw: string): string {
  let s = raw.trim().toLowerCase();
  for (let i = 0; i < FOLD_FROM.length; i++) {
    const from = FOLD_FROM[i]!;
    const to = FOLD_TO[i]!;
    if (from !== to) {
      s = s.split(from).join(to);
    }
  }
  return s;
}

/** Parámetros para LIKE según el grid de productos: patrón ya en minúsculas y sin tildes mapeadas. */
export function purchasingSearchLikePattern(foldedQuery: string): string {
  return `%${foldedQuery}%`;
}

/**
 * MySQL: mismo pliegue que en TS vía REPLACE anidados (sin `translate` de 2 cadenas).
 * Aplicar sobre `LOWER(col)`.
 */
export function mysqlFoldLowerColumnExpr(columnExpr: string): string {
  const pairs: Array<[string, string]> = [
    ['á', 'a'],
    ['é', 'e'],
    ['í', 'i'],
    ['ó', 'o'],
    ['ú', 'u'],
    ['ñ', 'n'],
    ['ü', 'u'],
    ['Á', 'a'],
    ['É', 'e'],
    ['Í', 'i'],
    ['Ó', 'o'],
    ['Ú', 'u'],
    ['Ñ', 'n'],
    ['Ü', 'u'],
  ];
  let e = `LOWER(${columnExpr})`;
  for (const [a, b] of pairs) {
    e = `REPLACE(${e}, '${a}', '${b}')`;
  }
  return e;
}
