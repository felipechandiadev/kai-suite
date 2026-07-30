import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import type { PosBackorderForFulfill } from "../types/pos-backorder-for-fulfill.types";

/**
 * Convierte líneas de encargo/reserva a `PosCartLine` para liquidación en POS.
 */
export function backorderLinesToCart(backorder: PosBackorderForFulfill): PosCartLine[] {
  return backorder.lines.flatMap((l) => {
    const qty = Number(l.quantity) || 0;
    if (qty <= 0) return [];
    const variantId = l.productVariantId ?? l.productId ?? l.id;
    const unitPrice = Number(l.unitPrice) || 0;
    const taxRate = Number(l.taxRate) || 0;
    const taxAmount = Number(l.taxAmount) || 0;
    const lineTotal = Number(l.total) || 0;
    const unitTaxAmount = qty > 0 ? taxAmount / qty : 0;
    const unitPriceWithTax = qty > 0 ? lineTotal / qty : unitPrice + unitTaxAmount;
    const displayName = l.variantName?.trim()
      ? `${l.productName} — ${l.variantName}`
      : l.productName;

    const line: PosCartLine = {
      productId: l.productId ?? "",
      productName: displayName,
      productDescription: null,
      productImageUrl: null,
      variantId,
      sku: l.productSku ?? null,
      barcode: null,
      unitAllowDecimals: l.unitAllowDecimals ?? false,
      unitSymbol: l.saleUnitSymbol ?? l.unitOfMeasure ?? null,
      saleUnitSymbol: l.saleUnitSymbol ?? null,
      stockBaseUnitSymbol: l.stockBaseUnitSymbol ?? null,
      stockBaseQtyPerCountSaleUnit: l.stockBaseQtyPerCountSaleUnit ?? null,
      unitId: null,
      unitPrice,
      unitTaxRate: taxRate,
      unitTaxAmount,
      unitPriceWithTax,
      trackInventory: true,
      availableStock: l.availableStock ?? null,
      availableStockBase: l.availableStockBase ?? null,
      attributes: [],
      metadata: {
        sourceBackorderLineId: l.id,
        reservedQty: qty,
        fulfillBackorderId: backorder.id,
      },
      quantity: qty,
    };
    return [line];
  });
}
