export function resolveVariantAttributeLabels(
  raw: Record<string, string> | undefined | null,
  attributeNameById: Map<string, string>,
): Record<string, string> {
  if (!raw || typeof raw !== 'object') {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    const trimmed = value != null ? String(value).trim() : '';
    if (!trimmed) {
      continue;
    }
    const label = attributeNameById.get(key) ?? key;
    out[label] = trimmed;
  }
  return out;
}

export function buildAttributeOptions(
  variants: Array<{ attributeValues: Record<string, string> }>,
): Record<string, string[]> {
  const order = new Map<string, string[]>();
  const seen = new Map<string, Set<string>>();

  for (const variant of variants) {
    for (const [dimension, value] of Object.entries(variant.attributeValues)) {
      if (!seen.has(dimension)) {
        seen.set(dimension, new Set());
        order.set(dimension, []);
      }
      const bucket = seen.get(dimension)!;
      if (!bucket.has(value)) {
        bucket.add(value);
        order.get(dimension)!.push(value);
      }
    }
  }

  return Object.fromEntries(order.entries());
}

export function pickDefaultVariantId(
  variants: Array<{ id: string; inStock: boolean }>,
): string | null {
  if (!variants.length) {
    return null;
  }
  const inStock = variants.find((v) => v.inStock);
  return inStock?.id ?? variants[0].id;
}
