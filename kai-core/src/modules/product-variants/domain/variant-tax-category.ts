export const VARIANT_TAX_CATEGORIES = [
  'TAX_STANDARD',
  'TAX_EXEMPT',
  'TAX_OUT_OF_SCOPE',
  'TAX_PRE_PAID',
  'TAX_REMITTED_UPSTREAM',
  'TAX_EXTERNAL',
] as const;

export type VariantTaxCategory = (typeof VARIANT_TAX_CATEGORIES)[number];

export const DEFAULT_VARIANT_TAX_CATEGORY: VariantTaxCategory = 'TAX_STANDARD';

export function isVariantTaxCategory(raw: unknown): raw is VariantTaxCategory {
  return (
    typeof raw === 'string' &&
    (VARIANT_TAX_CATEGORIES as readonly string[]).includes(raw.trim())
  );
}

export function normalizeVariantTaxCategory(raw: unknown): VariantTaxCategory {
  if (isVariantTaxCategory(raw)) {
    return raw.trim() as VariantTaxCategory;
  }
  return DEFAULT_VARIANT_TAX_CATEGORY;
}

export function isSpecialVariantTaxCategory(category: VariantTaxCategory): boolean {
  return category !== 'TAX_STANDARD';
}

export function allowsSaleTaxIds(category: VariantTaxCategory): boolean {
  return category === 'TAX_STANDARD';
}

export function forcesNetEqualsGross(category: VariantTaxCategory): boolean {
  return category !== 'TAX_STANDARD';
}

export function isLegallyExemptLine(category: VariantTaxCategory): boolean {
  return category === 'TAX_EXEMPT';
}

export function isOutOfFiscalScope(category: VariantTaxCategory): boolean {
  return category === 'TAX_OUT_OF_SCOPE';
}

export function resolveBoletaLineExempt(category: VariantTaxCategory): boolean {
  return category !== 'TAX_STANDARD';
}

export function variantHasLocalIva(category: VariantTaxCategory): boolean {
  return category === 'TAX_STANDARD';
}

export function defaultRequiresDteForCategory(category: VariantTaxCategory): boolean {
  return category !== 'TAX_OUT_OF_SCOPE';
}
