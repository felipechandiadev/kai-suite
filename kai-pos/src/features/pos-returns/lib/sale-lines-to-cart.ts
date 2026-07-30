import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import type {
  PosSaleForReturn,
  PosSaleForReturnLine,
} from "../types/pos-sale-for-return.types";

type VariantAccumulator = {
  variantId: string;
  lines: PosSaleForReturnLine[];
  soldQty: number;
  lineTotal: number;
  lineTax: number;
};

/**
 * Convierte líneas de venta a carrito de devolución.
 * - Precios desde snapshot de la venta (no lista actual).
 * - Agrupa por variante (mismo tope que valida el backend).
 * - Cantidad inicial = máximo devolvable (el usuario puede bajar para devolución parcial).
 */
export function saleLinesToCart(sale: PosSaleForReturn): PosCartLine[] {
  const maxByVariant: Record<string, number> = {
    ...(sale.lineMaxReturnableQtyByVariantId ?? {}),
  };
  if (Object.keys(maxByVariant).length === 0) {
    for (const l of sale.lines) {
      const variantId = (l.productVariantId ?? l.productId ?? l.id)?.trim();
      if (!variantId) continue;
      const n = Math.max(
        0,
        Number(l.returnableQuantity ?? l.quantity) || 0,
      );
      if (n > 0) maxByVariant[variantId] = n;
    }
  }
  const byVariant = new Map<string, VariantAccumulator>();

  for (const l of sale.lines) {
    const soldQty = Number(l.quantity) || 0;
    if (soldQty <= 0) continue;
    const variantId = (l.productVariantId ?? l.productId ?? l.id)?.trim();
    if (!variantId) continue;
    const maxReturn = Math.max(
      0,
      Number(maxByVariant[variantId] ?? l.returnableQuantity) || 0,
    );
    if (maxReturn <= 0) continue;

    const prev = byVariant.get(variantId);
    const lineTotal = Number(l.total) || 0;
    const lineTax = Number(l.taxAmount) || 0;
    if (prev) {
      prev.lines.push(l);
      prev.soldQty += soldQty;
      prev.lineTotal += lineTotal;
      prev.lineTax += lineTax;
    } else {
      byVariant.set(variantId, {
        variantId,
        lines: [l],
        soldQty,
        lineTotal,
        lineTax,
      });
    }
  }

  return [...byVariant.values()].flatMap((acc) => {
    const maxQty = Math.max(
      0,
      Number(maxByVariant[acc.variantId]) || 0,
    );
    if (maxQty <= 0) return [];

    const l = acc.lines[0];
    const unitPriceWithTax =
      acc.soldQty > 0 ? acc.lineTotal / acc.soldQty : Number(l.unitPrice) || 0;
    const unitTaxAmount = acc.soldQty > 0 ? acc.lineTax / acc.soldQty : 0;
    const unitPrice = Number(l.unitPrice) || unitPriceWithTax - unitTaxAmount;
    const taxRate = Number(l.taxRate) || 0;
    const displayName = l.variantName?.trim()
      ? `${l.productName} — ${l.variantName}`
      : l.productName;

    const line: PosCartLine = {
      productId: l.productId ?? "",
      productName: displayName,
      productDescription: null,
      productImageUrl: null,
      variantId: acc.variantId,
      sku: l.productSku ?? null,
      barcode: null,
      unitAllowDecimals: false,
      unitSymbol: l.unitOfMeasure ?? null,
      unitId: null,
      unitPrice,
      unitTaxRate: taxRate,
      unitTaxAmount,
      unitPriceWithTax,
      trackInventory: false,
      availableStock: null,
      availableStockBase: null,
      attributes: [],
      metadata: { sourceSaleLineId: l.id },
      quantity: maxQty,
    };
    return [line];
  });
}
