import type { PosDeliveryConfig } from "@/features/pos-delivery/types/pos-delivery.types";

/** Total a cobrar en venta normal incluyendo fee de reparto local (si hay). */
export function amountToPayWithPosDelivery(
  saleTotal: number,
  posDelivery: PosDeliveryConfig | null | undefined,
): number {
  const products = Math.max(0, Math.round(saleTotal));
  const fee = Math.max(0, Math.round(Number(posDelivery?.shippingFee) || 0));
  return products + fee;
}
