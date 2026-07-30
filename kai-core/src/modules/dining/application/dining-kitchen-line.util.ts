import type { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';

export function kitchenVariantLabel(
  variant?: Pick<ProductVariant, 'sku'> & {
    product?: { name?: string | null } | null;
  } | null,
): string | null {
  return (
    variant?.product?.name?.trim() ||
    variant?.sku?.trim() ||
    null
  );
}

export function variantAttributesForKitchen(
  variant?: Pick<ProductVariant, 'attributeValues'> | null,
): Array<{ attributeValue: string }> {
  const raw = variant?.attributeValues;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return [];
  }
  const attrs: Array<{ attributeValue: string }> = [];
  for (const value of Object.values(raw as Record<string, unknown>)) {
    const attributeValue = value != null ? String(value).trim() : '';
    if (attributeValue) {
      attrs.push({ attributeValue });
    }
  }
  return attrs;
}
