const COMBINING_MARKS = /[\u0300-\u036f]/g;

/**
 * Normaliza texto para búsqueda: minúsculas y sin diacríticos (café → cafe).
 * Complementa `unaccent` en PostgreSQL en columnas almacenadas.
 */
export function foldLatinSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLocaleLowerCase('es');
}

export function toLatinSearchPattern(term: string): string {
  const folded = foldLatinSearchText(term.trim());
  return folded.length > 0 ? `%${folded}%` : '';
}
