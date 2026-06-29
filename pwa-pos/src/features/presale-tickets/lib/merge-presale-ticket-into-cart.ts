import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import type { LoadedPresaleTicketMeta } from "@/features/pos-cart/types/pos-cart-mode.types";
import type { PosProductSearchItem } from "@/features/pos-products/types/pos-product.types";

/** Suma cantidades del ticket al carrito (una línea por variantId; precio de lista). */
export function mergePresaleTicketIntoCart(
  prevLines: PosCartLine[],
  ticket: LoadedPresaleTicketMeta,
  listPriceItems: PosProductSearchItem[],
): PosCartLine[] {
  const byVariant = new Map(listPriceItems.map((p) => [p.variantId, p]));
  const next = [...prevLines];

  for (const [variantId, ticketQty] of Object.entries(ticket.lineMaxQtyByVariantId)) {
    const qty = Number(ticketQty) || 0;
    if (qty <= 0) continue;

    const i = next.findIndex((l) => l.variantId === variantId);
    if (i >= 0) {
      next[i] = { ...next[i], quantity: next[i].quantity + qty };
      continue;
    }

    const item = byVariant.get(variantId);
    if (!item) continue;
    next.push({ ...(item as PosProductSearchItem), quantity: qty } as PosCartLine);
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
