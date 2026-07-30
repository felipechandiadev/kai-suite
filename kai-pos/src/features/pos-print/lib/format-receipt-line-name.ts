/** Compara nombres sin distinguir mayúsculas/acentos. */
function sameLabel(a: string, b: string): boolean {
  return a.trim().localeCompare(b.trim(), undefined, { sensitivity: "accent" }) === 0;
}

/**
 * Nombre de línea para ticket / detalle: producto + atributos distintos del nombre base.
 * Si no hay atributos útiles, solo el nombre del producto (sin repetir).
 */
export function formatReceiptLineDisplayName(
  productName: string,
  attributes: string[] | null | undefined,
): string {
  const base = productName.trim();
  if (!base) return "";

  const seen = new Set<string>();
  const extras: string[] = [];
  for (const raw of attributes ?? []) {
    const a = String(raw ?? "").trim();
    if (!a || sameLabel(a, base)) continue;
    const key = a.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    extras.push(a);
  }

  if (extras.length === 0) return base;
  return [base, ...extras].join(" · ");
}
