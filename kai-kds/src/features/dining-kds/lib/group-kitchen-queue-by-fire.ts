import type { DiningOrderLineDto } from "../infrastructure/dining-kds.request";

export type KdsPedidoGroup = {
  /** kitchenFireId or line.id (legacy). */
  fireId: string;
  diningOrderId: string;
  displayLabel: string;
  tableCode?: string;
  sentToKitchenAt: string | null;
  kitchenFireNumber: number | null;
  lines: DiningOrderLineDto[];
};

export function effectiveKitchenFireId(line: {
  id: string;
  kitchenFireId?: string | null;
}): string {
  const fire = line.kitchenFireId?.trim();
  return fire || line.id;
}

/** Agrupa cola KDS por tanda (pedido) dentro de la UP; más recientes a la izquierda. */
export function groupKitchenQueueByFire(
  lines: DiningOrderLineDto[],
): KdsPedidoGroup[] {
  const map = new Map<string, KdsPedidoGroup>();

  for (const line of lines) {
    const fireId = effectiveKitchenFireId(line);
    const existing = map.get(fireId);
    const sentAt = line.sentToKitchenAt ?? null;
    const fireNumber =
      typeof line.kitchenFireNumber === "number" &&
      Number.isFinite(line.kitchenFireNumber)
        ? line.kitchenFireNumber
        : null;
    if (existing) {
      existing.lines.push(line);
      if (
        sentAt &&
        (!existing.sentToKitchenAt || sentAt < existing.sentToKitchenAt)
      ) {
        existing.sentToKitchenAt = sentAt;
      }
      if (existing.kitchenFireNumber == null && fireNumber != null) {
        existing.kitchenFireNumber = fireNumber;
      }
      continue;
    }
    const order = line.diningOrder;
    map.set(fireId, {
      fireId,
      diningOrderId: line.diningOrderId,
      displayLabel: order?.displayLabel ?? "Cuenta",
      tableCode: order?.diningTable?.code,
      sentToKitchenAt: sentAt,
      kitchenFireNumber: fireNumber,
      lines: [line],
    });
  }

  // Más reciente primero (izquierda en grid LTR): 12:00 → 11:20 → 11:00 …
  return [...map.values()].sort((a, b) => {
    const ta = a.sentToKitchenAt ?? "";
    const tb = b.sentToKitchenAt ?? "";
    if (ta !== tb) return ta > tb ? -1 : 1;
    return a.fireId.localeCompare(b.fireId);
  });
}
