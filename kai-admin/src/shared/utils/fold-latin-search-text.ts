const COMBINING_MARKS = /[\u0300-\u036f]/g;

/** Normaliza para búsqueda: minúsculas y sin tildes (café / cAFE → cafe). */
export function foldLatinSearchText(value: string): string {
  return value.normalize("NFD").replace(COMBINING_MARKS, "").toLocaleLowerCase("es");
}

export function latinSearchIncludes(haystack: string, needle: string): boolean {
  const q = foldLatinSearchText(needle.trim());
  if (!q) {
    return true;
  }
  return foldLatinSearchText(haystack).includes(q);
}
