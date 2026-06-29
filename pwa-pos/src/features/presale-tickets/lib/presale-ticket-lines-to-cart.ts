import type { LoadedPresaleTicketMeta } from "@/features/pos-cart/types/pos-cart-mode.types";
import type { PresaleTicketDetail } from "../types/presale-ticket.types";

export function buildPresaleTicketMeta(ticket: PresaleTicketDetail): LoadedPresaleTicketMeta {
  const lineMaxQtyByVariantId: Record<string, number> = {};
  for (const l of ticket.lines) {
    const qty = Number(l.quantity) || 0;
    if (qty <= 0) continue;
    const variantId = l.productVariantId ?? l.productId ?? l.id;
    lineMaxQtyByVariantId[variantId] = (lineMaxQtyByVariantId[variantId] ?? 0) + qty;
  }
  return {
    id: ticket.id,
    code: ticket.code,
    total: Number(ticket.total) || 0,
    createdAt: ticket.createdAt,
    lineMaxQtyByVariantId,
  };
}
