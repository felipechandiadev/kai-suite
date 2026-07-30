import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import type { LoadedPresaleTicketMeta } from "@/features/pos-cart/types/pos-cart-mode.types";
import type { PosProductSearchItem } from "@/features/pos-products/types/pos-product.types";
import {
  cartPriceListId,
  stampProductAsCartLine,
  type PriceListStamp,
} from "@/features/pos-cart/lib/pos-cart-price-list";

/**
 * Suma cantidades del ticket al carrito (una línea por variantId; precio de lista).
 * Devuelve `null` si el ticket implica otra lista de precios que la del carrito.
 */
export function mergePresaleTicketIntoCart(
  prevLines: PosCartLine[],
  ticket: LoadedPresaleTicketMeta,
  listPriceItems: PosProductSearchItem[],
  stamp: PriceListStamp,
): PosCartLine[] | null {
  const cartList = cartPriceListId(prevLines);
  if (cartList && cartList !== stamp.priceListId) {
    return null;
  }

  const byVariant = new Map(listPriceItems.map((p) => [p.variantId, p]));
  const next = [...prevLines];

  for (const [variantId, ticketQty] of Object.entries(ticket.lineMaxQtyByVariantId)) {
    const qty = Number(ticketQty) || 0;
    if (qty <= 0) continue;

    const i = next.findIndex((l) => l.variantId === variantId);
    if (i >= 0) {
      next[i] = {
        ...next[i],
        quantity: next[i].quantity + qty,
        priceListId: next[i].priceListId?.trim() || stamp.priceListId,
        priceListName: next[i].priceListName?.trim() || stamp.priceListName,
      };
      continue;
    }

    const item = byVariant.get(variantId);
    if (!item) continue;
    next.push(stampProductAsCartLine(item, stamp, qty));
  }

  return next;
}

/** Resta las cantidades aportadas por un ticket al desvincular. */
export function subtractPresaleTicketFromCart(
  prevLines: PosCartLine[],
  ticket: LoadedPresaleTicketMeta,
): PosCartLine[] {
  return prevLines
    .map((l) => {
      const subtract = ticket.lineMaxQtyByVariantId[l.variantId];
      if (typeof subtract !== "number" || subtract <= 0) return l;
      return { ...l, quantity: l.quantity - subtract };
    })
    .filter((l) => l.quantity > 0);
}
