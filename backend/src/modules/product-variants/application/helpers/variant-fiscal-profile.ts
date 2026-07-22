import { BadRequestException } from '@nestjs/common';
import { TaxType } from '@modules/taxes/domain/tax.entity';
import {
  DEFAULT_VARIANT_TAX_CATEGORY,
  defaultRequiresDteForCategory,
  isOutOfFiscalScope,
  isSpecialVariantTaxCategory,
  normalizeVariantTaxCategory,
  type VariantTaxCategory,
} from '../../domain/variant-tax-category';

const SALE_TAX_TYPES = new Set<string>([TaxType.IVA, TaxType.SPECIFIC, TaxType.EXEMPT]);

export type CatalogTaxRateRow = {
  id: string;
  taxType: string;
  rate: number;
  isActive: boolean;
};

export function effectiveGrossFactorFromCatalog(
  catalogTaxes: readonly CatalogTaxRateRow[],
  selectedTaxIds: readonly string[],
): number {
  const idSet = new Set(selectedTaxIds.map(String));
  let sumRates = 0;
  for (const t of catalogTaxes) {
    if (!t.isActive || !idSet.has(t.id) || !SALE_TAX_TYPES.has(String(t.taxType))) {
      continue;
    }
    const r = Number(t.rate);
    if (Number.isFinite(r) && r > 0) {
      sumRates += r;
    }
  }
  return 1 + sumRates / 100;
}

export function applyTaxIdsToPriceRows(
  items: VariantPriceFiscalRow[],
  taxIds: string[] | null,
  catalogTaxes: readonly CatalogTaxRateRow[],
): VariantPriceFiscalRow[] {
  const ids = Array.isArray(taxIds) ? taxIds.map(String).filter(Boolean) : [];
  const factor = effectiveGrossFactorFromCatalog(catalogTaxes, ids);
  return items.map((item) => {
    const net = Math.round(Number(item.netPrice) || 0);
    return {
      ...item,
      netPrice: net,
      grossPrice: Math.round(net * factor),
      taxIds: ids.length > 0 ? [...ids] : null,
    };
  });
}

/**
 * Alinea filas de precio con impuestos de venta.
 * - Sin impuestos (factor 1): neto = bruto.
 * - Si neto === bruto y hay IVA: interpreta el monto como **bruto** (precio de góndola)
 *   y deriva el neto (caso creación rápida stock / POS).
 * - Si ya vienen distintos: bruto = neto × factor (fuente de verdad = neto).
 */
export function alignPriceRowsWithSaleTaxes(
  items: VariantPriceFiscalRow[],
  taxIds: string[] | null,
  catalogTaxes: readonly CatalogTaxRateRow[],
): VariantPriceFiscalRow[] {
  const ids = Array.isArray(taxIds) ? taxIds.map(String).filter(Boolean) : [];
  const factor = effectiveGrossFactorFromCatalog(catalogTaxes, ids);
  return items.map((item) => {
    const netIn = Math.round(Number(item.netPrice) || 0);
    const grossIn = Math.round(Number(item.grossPrice) || 0);
    if (ids.length === 0 || factor <= 1) {
      const amount = grossIn > 0 ? grossIn : netIn;
      return {
        ...item,
        netPrice: amount,
        grossPrice: amount,
        taxIds: null,
      };
    }
    if (netIn === grossIn) {
      const gross = grossIn;
      const net = Math.round(gross / factor);
      return {
        ...item,
        netPrice: net,
        grossPrice: gross,
        taxIds: [...ids],
      };
    }
    return {
      ...item,
      netPrice: netIn,
      grossPrice: Math.round(netIn * factor),
      taxIds: [...ids],
    };
  });
}

export type VariantPriceFiscalRow = {
  netPrice: number;
  grossPrice: number;
  taxIds?: string[] | null;
};

export type ApplyVariantFiscalProfileInput = {
  taxCategory?: unknown;
  requiresDte?: unknown;
  taxIds?: string[] | null;
  priceListItems?: VariantPriceFiscalRow[];
};

export type ApplyVariantFiscalProfileResult = {
  taxCategory: VariantTaxCategory;
  requiresDte: boolean;
  taxIds: string[] | null;
  priceListItems?: VariantPriceFiscalRow[];
};

export function resolveDefaultIvaTaxIdsFromCatalog(
  taxes: ReadonlyArray<{
    id: string;
    taxType: string;
    isDefault: boolean;
    isActive: boolean;
  }>,
): string[] {
  const iva = taxes.filter((t) => t.isActive && t.taxType === 'IVA');
  const defaults = iva.filter((t) => t.isDefault).map((t) => t.id);
  if (defaults.length > 0) {
    return defaults;
  }
  return iva[0]?.id ? [iva[0].id] : [];
}

export function validateSpecialCategoryPrices(items: VariantPriceFiscalRow[]): void {
  for (const item of items) {
    const net = Math.round(Number(item.netPrice) || 0);
    const gross = Math.round(Number(item.grossPrice) || 0);
    if (net !== gross) {
      throw new BadRequestException(
        'Con tratamiento sin IVA local, el precio con impuestos debe igualar el neto.',
      );
    }
  }
}

export function applyVariantFiscalProfile(
  input: ApplyVariantFiscalProfileInput,
  defaultIvaTaxIds: string[],
): ApplyVariantFiscalProfileResult {
  const taxCategory = normalizeVariantTaxCategory(
    input.taxCategory ?? DEFAULT_VARIANT_TAX_CATEGORY,
  );
  let requiresDte = input.requiresDte !== false;
  if (isOutOfFiscalScope(taxCategory)) {
    requiresDte = false;
  } else if (input.requiresDte === undefined && !defaultRequiresDteForCategory(taxCategory)) {
    requiresDte = false;
  }

  if (!isSpecialVariantTaxCategory(taxCategory)) {
    let taxIds = Array.isArray(input.taxIds)
      ? input.taxIds.map(String).filter(Boolean)
      : [];
    if (taxIds.length === 0 && defaultIvaTaxIds.length > 0) {
      taxIds = [...defaultIvaTaxIds];
    }
    return {
      taxCategory,
      requiresDte,
      taxIds: taxIds.length > 0 ? taxIds : null,
      priceListItems: input.priceListItems,
    };
  }

  const priceListItems = input.priceListItems ?? [];
  if (priceListItems.length > 0) {
    validateSpecialCategoryPrices(priceListItems);
  }

  return {
    taxCategory,
    requiresDte,
    taxIds: [],
    priceListItems: priceListItems.map((item) => ({
      ...item,
      grossPrice: Math.round(Number(item.netPrice) || 0),
      taxIds: [],
    })),
  };
}
