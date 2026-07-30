import type { DiningOrderLineDto } from "../infrastructure/dining-kds.request";
import { KDS_PENDING_STATUSES } from "../realtime/dining-realtime.types";
import { effectiveKitchenFireId } from "./group-kitchen-queue-by-fire";

/**
 * Quita del panel los fires donde ya no queda ningún ítem SENT/PREPARING
 * (pedido completo → se elimina la tarjeta).
 */
export function pruneCompletedKitchenFires(
  lines: DiningOrderLineDto[],
): DiningOrderLineDto[] {
  const pendingFireIds = new Set<string>();
  for (const line of lines) {
    if (KDS_PENDING_STATUSES.has(line.kitchenStatus)) {
      pendingFireIds.add(effectiveKitchenFireId(line));
    }
  }
  return lines.filter((line) =>
    pendingFireIds.has(effectiveKitchenFireId(line)),
  );
}

export function isKitchenItemGroupReady(lines: DiningOrderLineDto[]): boolean {
  return (
    lines.length > 0 &&
    lines.every(
      (l) =>
        l.kitchenStatus === "READY" || l.kitchenStatus === "READY_FOR_PICKUP",
    )
  );
}
