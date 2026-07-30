import {
  isVariantTaxCategory,
  normalizeVariantTaxCategory,
  resolveBoletaLineExempt,
  type VariantTaxCategory,
} from '@modules/product-variants/domain/variant-tax-category';

/**
 * Determina si una línea de boleta va a montos exentos (MntExe / IndExe).
 * Prioridad: taxCategory de variante → heurística legacy por montos.
 */
export function resolveLineBoletaExempt(args: {
  taxCategory?: unknown;
  taxRate?: number | null;
  taxAmount?: number | null;
}): boolean {
  if (args.taxCategory != null && isVariantTaxCategory(args.taxCategory)) {
    return resolveBoletaLineExempt(normalizeVariantTaxCategory(args.taxCategory));
  }
  const rate = Number(args.taxRate) || 0;
  const amount = Number(args.taxAmount) || 0;
  return rate === 0 && amount === 0;
}

export function buildVariantTaxCategoryMap(
  entries: ReadonlyArray<{ variantId: string; taxCategory?: unknown }>,
): Map<string, VariantTaxCategory> {
  const map = new Map<string, VariantTaxCategory>();
  for (const entry of entries) {
    const id = String(entry.variantId ?? '').trim();
    if (!id) continue;
    map.set(id, normalizeVariantTaxCategory(entry.taxCategory));
  }
  return map;
}
