import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import type { PosProductSearchItem } from "@/features/pos-products/types/pos-product.types";
import type { PosDiningOrderLine } from "../types/dining-pos.types";

/**
 * Convierte líneas activas de una cuenta salón a líneas de carrito POS para cobro.
 * Agrega cantidades por variante (excluye ítems cancelados).
 */
export function diningOrderLinesToCart(
  orderLines: PosDiningOrderLine[],
  catalogItems: PosProductSearchItem[],
): PosCartLine[] {
  const byVariant = new Map<string, PosProductSearchItem>();
  for (const item of catalogItems) {
    byVariant.set(item.variantId, item);
  }

  const qtyByVariant = new Map<string, number>();
  for (const line of orderLines) {
    if (line.kitchenStatus === "CANCELLED") continue;
    const qty = Number(line.quantity) || 0;
    if (qty <= 0) continue;
    qtyByVariant.set(line.productVariantId, (qtyByVariant.get(line.productVariantId) ?? 0) + qty);
  }

  const cartLines: PosCartLine[] = [];
  for (const [variantId, quantity] of qtyByVariant) {
    const item = byVariant.get(variantId);
    if (!item) continue;
    cartLines.push({
      ...item,
      quantity,
      metadata: {
        ...(item.metadata ?? {}),
        sourceDiningOrder: true,
      },
    });
  }
  return cartLines;
}
