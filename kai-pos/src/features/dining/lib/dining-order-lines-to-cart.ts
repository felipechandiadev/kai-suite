import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import type { PosProductSearchItem } from "@/features/pos-products/types/pos-product.types";
import type { PosDiningOrderLine } from "../types/dining-pos.types";

/**
 * Convierte líneas activas de cuenta salón a líneas de carrito POS para cobro.
 * Host + cada agregado = línea DTE independiente (sin colapsar por variante).
 */
export function diningOrderLinesToCart(
  orderLines: PosDiningOrderLine[],
  catalogItems: PosProductSearchItem[],
): PosCartLine[] {
  const byVariant = new Map<string, PosProductSearchItem>();
  for (const item of catalogItems) {
    byVariant.set(item.variantId, item);
  }

  const cartLines: PosCartLine[] = [];
  for (const line of orderLines) {
    if (line.kitchenStatus === "CANCELLED") continue;
    const lineQty = Number(line.quantity) || 0;
    if (lineQty <= 0) continue;

    const hostItem = byVariant.get(line.productVariantId);
    if (hostItem) {
      cartLines.push({
        ...hostItem,
        quantity: lineQty,
        metadata: {
          ...(hostItem.metadata ?? {}),
          sourceDiningOrder: true,
          sourceDiningLineId: line.id,
        },
      });
    }

    for (const addon of line.addons ?? []) {
      const addonQty = Number(addon.quantity) || 0;
      if (addonQty <= 0) continue;
      const totalQty = lineQty * addonQty;
      const addonItem = byVariant.get(addon.addonVariantId);
      if (!addonItem) continue;
      cartLines.push({
        ...addonItem,
        quantity: totalQty,
        metadata: {
          ...(addonItem.metadata ?? {}),
          sourceDiningOrder: true,
          sourceDiningLineId: line.id,
          sourceDiningAddonId: addon.id,
        },
      });
    }
  }

  return cartLines;
}
