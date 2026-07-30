/** Texto legible de atributos de variante (solo valores, como en la grilla de stock). */
export function formatVariantAttributeValues(
  attributeValues?: Record<string, string> | null,
): string {
  if (!attributeValues || typeof attributeValues !== 'object') {
    return '';
  }
  return Object.values(attributeValues)
    .map((v) => String(v ?? '').trim())
    .filter(Boolean)
    .join(' · ');
}

export function resolveStockProductName(variant: {
  sku?: string;
  product?: { name?: string | null };
} | null): string {
  return (
    variant?.product?.name?.trim() ||
    variant?.sku?.trim() ||
    'Producto'
  );
}
