import {
  effectiveGrossFactorFromCatalog,
  type CatalogTaxRateRow,
} from '@modules/product-variants/application/helpers/variant-fiscal-profile';

/**
 * Tasas de impuesto legítimas para una variante: la que sale de sus impuestos de venta y las
 * que están implícitas en sus precios de lista (bruto/neto − 1). El POS deriva el impuesto
 * de la línea del precio de lista, así que cualquiera de esas tasas es válida.
 */
export function plausibleTaxRates(params: {
  variantTaxIds: readonly string[] | null | undefined;
  catalogTaxes: readonly CatalogTaxRateRow[];
  priceItems: ReadonlyArray<{ netPrice: number | string; grossPrice: number | string }>;
}): number[] {
  const rates = new Set<number>();
  const ids = (params.variantTaxIds ?? []).map(String).filter(Boolean);
  rates.add(round4(effectiveGrossFactorFromCatalog(params.catalogTaxes, ids) - 1));
  for (const item of params.priceItems) {
    const net = Number(item.netPrice);
    const gross = Number(item.grossPrice);
    if (net > 0 && gross >= net && gross / net <= 2) {
      rates.add(round4(gross / net - 1));
    }
  }
  return [...rates];
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/**
 * ¿El impuesto de la línea corresponde a alguna tasa legítima? Tolera el redondeo del precio
 * bruto por unidad (hasta 0,5 por unidad) más 1 de holgura.
 */
export function isLineTaxPlausible(params: {
  unitNet: number;
  quantity: number;
  taxAmount: number;
  rates: readonly number[];
}): boolean {
  const { unitNet, quantity, taxAmount, rates } = params;
  const tolerance = 0.5 * quantity + 1;
  return rates.some(
    (rate) => Math.abs(taxAmount - unitNet * quantity * rate) <= tolerance,
  );
}
