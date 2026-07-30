import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import type { PosProductSearchItem } from "@/features/pos-products/types/pos-product.types";

/** Conserva precios del snapshot de cotización; completa stock, atributos e imagen desde POS. */
export function mergeQuotationLineWithPosSnapshot(
  line: PosCartLine,
  pos: PosProductSearchItem,
): PosCartLine {
  return {
    ...line,
    productDescription: pos.productDescription ?? line.productDescription,
    productImageUrl: pos.productImageUrl ?? line.productImageUrl,
    sku: pos.sku ?? line.sku,
    barcode: pos.barcode ?? line.barcode,
    unitAllowDecimals: pos.unitAllowDecimals,
    unitSymbol: pos.saleUnitSymbol ?? pos.unitSymbol ?? line.unitSymbol,
    saleUnitSymbol: pos.saleUnitSymbol ?? pos.unitSymbol ?? null,
    stockBaseUnitSymbol: pos.stockBaseUnitSymbol ?? null,
    stockBaseQtyPerCountSaleUnit: pos.stockBaseQtyPerCountSaleUnit ?? null,
    unitId: pos.unitId ?? line.unitId,
    trackInventory: pos.trackInventory,
    availableStock: pos.availableStock,
    availableStockBase: pos.availableStockBase,
    attributes: pos.attributes?.length ? pos.attributes : line.attributes,
    unitPrice: line.unitPrice,
    unitTaxRate: line.unitTaxRate,
    unitTaxAmount: line.unitTaxAmount,
    unitPriceWithTax: line.unitPriceWithTax,
    quantity: line.quantity,
    metadata: line.metadata,
  };
}

export function enrichQuotationLinesWithPosSnapshot(
  lines: PosCartLine[],
  products: PosProductSearchItem[],
): PosCartLine[] {
  const byVariantId = new Map(products.map((p) => [p.variantId, p]));
  return lines.map((line) => {
    const pos = byVariantId.get(line.variantId);
    return pos ? mergeQuotationLineWithPosSnapshot(line, pos) : line;
  });
}
