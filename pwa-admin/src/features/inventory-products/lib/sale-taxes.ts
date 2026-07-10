import type { TaxListItem } from "@/features/accounting-taxes/types/tax.types";
import { formatTaxRate, taxTypeLabel } from "@/features/accounting-taxes/types/tax.types";
import {
  allowsSaleTaxIds,
  DEFAULT_VARIANT_TAX_CATEGORY,
  normalizeVariantTaxCategory,
  type VariantTaxCategory,
} from "../types/variant-fiscal.types";
import type { ProductPriceListItemRow, ProductVariantGridRow } from "../types/product-grid.types";

const SALE_TAX_TYPES = new Set(["IVA", "SPECIFIC", "EXEMPT"]);

/** Impuestos del catálogo seleccionables en venta (excluye retenciones). */
export function filterSelectableSaleTaxes(taxes: readonly TaxListItem[]): TaxListItem[] {
  return taxes.filter((t) => t.isActive !== false && t.taxType !== "RETENTION");
}

export function isSaleTaxType(taxType: TaxListItem["taxType"]): boolean {
  return SALE_TAX_TYPES.has(taxType);
}

export function formatSaleTaxLabel(tax: TaxListItem): string {
  return `${tax.name} (${formatTaxRate(tax.rate)}) · ${taxTypeLabel(tax.taxType)}`;
}

/**
 * IDs de impuestos efectivos de la variante: maestro en variant.taxIds,
 * fallback a fila de precio o IVA por defecto (solo TAX_STANDARD).
 */
export function resolveVariantTaxIds(
  variant: Pick<ProductVariantGridRow, "taxIds" | "taxCategory">,
  priceListItem: Pick<ProductPriceListItemRow, "taxIds"> | undefined,
  defaultIvaTaxIds: readonly string[],
  taxCategoryOverride?: VariantTaxCategory,
): string[] {
  const taxCategory = taxCategoryOverride ?? normalizeVariantTaxCategory(variant.taxCategory ?? DEFAULT_VARIANT_TAX_CATEGORY);
  if (!allowsSaleTaxIds(taxCategory)) {
    return [];
  }
  if (Array.isArray(variant.taxIds) && variant.taxIds.length > 0) {
    return [...variant.taxIds];
  }
  if (Array.isArray(priceListItem?.taxIds) && priceListItem.taxIds.length > 0) {
    return [...priceListItem.taxIds];
  }
  return defaultIvaTaxIds.length > 0 ? [...defaultIvaTaxIds] : [];
}

export function catalogDefaultIvaTaxIds(taxes: readonly TaxListItem[]): string[] {
  const iva = taxes.filter((t) => t.isActive && t.taxType === "IVA");
  const defaults = iva.filter((t) => t.isDefault).map((t) => t.id);
  if (defaults.length > 0) {
    return defaults;
  }
  return iva[0]?.id != null ? [iva[0].id] : [];
}
