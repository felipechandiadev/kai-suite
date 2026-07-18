import { DiningOrderStatus, KitchenItemStatus } from '../domain/dining.enums';

const ACTIVE_KITCHEN_STATUSES = new Set<KitchenItemStatus>([
  KitchenItemStatus.SENT,
  KitchenItemStatus.PREPARING,
]);

const READY_KITCHEN_STATUSES = new Set<KitchenItemStatus>([
  KitchenItemStatus.READY,
  KitchenItemStatus.SERVED,
]);

export function recomputeOrderStatusFromLines(
  currentStatus: DiningOrderStatus,
  lines: Array<{ kitchenStatus: KitchenItemStatus }>,
): DiningOrderStatus {
  if (
    currentStatus === DiningOrderStatus.CLOSED ||
    currentStatus === DiningOrderStatus.BILLING
  ) {
    return currentStatus;
  }

  const relevant = lines.filter(
    (line) => line.kitchenStatus !== KitchenItemStatus.CANCELLED,
  );
  if (relevant.length === 0) {
    return DiningOrderStatus.OPEN;
  }

  const hasSent = relevant.some((line) =>
    ACTIVE_KITCHEN_STATUSES.has(line.kitchenStatus),
  );
  const hasDraft = relevant.some(
    (line) => line.kitchenStatus === KitchenItemStatus.DRAFT,
  );
  const sentLines = relevant.filter(
    (line) => line.kitchenStatus !== KitchenItemStatus.DRAFT,
  );

  if (sentLines.length === 0) {
    return DiningOrderStatus.OPEN;
  }

  const allSentReady = sentLines.every((line) =>
    READY_KITCHEN_STATUSES.has(line.kitchenStatus),
  );
  const someSentReady = sentLines.some((line) =>
    READY_KITCHEN_STATUSES.has(line.kitchenStatus),
  );

  if (allSentReady && !hasDraft) {
    return DiningOrderStatus.READY;
  }
  if (someSentReady || hasSent) {
    return hasSent && someSentReady
      ? DiningOrderStatus.PARTIAL_READY
      : DiningOrderStatus.SENT;
  }

  return DiningOrderStatus.SENT;
}

export function assertOrderStatusTransition(
  from: DiningOrderStatus,
  to: DiningOrderStatus,
): void {
  const allowed: Record<DiningOrderStatus, DiningOrderStatus[]> = {
    [DiningOrderStatus.FREE]: [DiningOrderStatus.OPEN],
    [DiningOrderStatus.OPEN]: [
      DiningOrderStatus.SENT,
      DiningOrderStatus.PARTIAL_READY,
      DiningOrderStatus.READY,
      DiningOrderStatus.BILLING,
      DiningOrderStatus.CLOSED,
    ],
    [DiningOrderStatus.SENT]: [
      DiningOrderStatus.PARTIAL_READY,
      DiningOrderStatus.READY,
      DiningOrderStatus.BILLING,
      DiningOrderStatus.CLOSED,
    ],
    [DiningOrderStatus.PARTIAL_READY]: [
      DiningOrderStatus.READY,
      DiningOrderStatus.BILLING,
      DiningOrderStatus.CLOSED,
    ],
    [DiningOrderStatus.READY]: [
      DiningOrderStatus.BILLING,
      DiningOrderStatus.CLOSED,
      DiningOrderStatus.OPEN,
      DiningOrderStatus.SENT,
      DiningOrderStatus.PARTIAL_READY,
    ],
    [DiningOrderStatus.BILLING]: [
      DiningOrderStatus.CLOSED,
      DiningOrderStatus.OPEN,
      DiningOrderStatus.SENT,
      DiningOrderStatus.PARTIAL_READY,
      DiningOrderStatus.READY,
    ],
    [DiningOrderStatus.CLOSED]: [],
  };

  if (!allowed[from]?.includes(to)) {
    throw new Error(
      `Transición de estado no permitida: ${from} → ${to}`,
    );
  }
}

export function canRequestBill(status: DiningOrderStatus): boolean {
  return (
    status === DiningOrderStatus.READY ||
    status === DiningOrderStatus.PARTIAL_READY ||
    status === DiningOrderStatus.SENT ||
    status === DiningOrderStatus.OPEN
  );
}

export function canAddItems(status: DiningOrderStatus): boolean {
  return (
    status === DiningOrderStatus.OPEN ||
    status === DiningOrderStatus.SENT ||
    status === DiningOrderStatus.PARTIAL_READY ||
    status === DiningOrderStatus.READY ||
    // Pedir cuenta no cierra la comanda: se puede seguir agregando (reabre al agregar).
    status === DiningOrderStatus.BILLING
  );
}

/** Sale de BILLING y recalcula estado operativo desde las líneas. */
export function reopenFromBilling(
  lines: Array<{ kitchenStatus: KitchenItemStatus }>,
): DiningOrderStatus {
  return recomputeOrderStatusFromLines(DiningOrderStatus.OPEN, lines);
}

export function canSendToKitchen(
  lines: Array<{ kitchenStatus: KitchenItemStatus }>,
): boolean {
  return lines.some(
    (line) => line.kitchenStatus === KitchenItemStatus.DRAFT,
  );
}

export function canCancelLine(kitchenStatus: KitchenItemStatus): boolean {
  return (
    kitchenStatus === KitchenItemStatus.DRAFT ||
    kitchenStatus === KitchenItemStatus.SENT
  );
}

export function canMarkReady(kitchenStatus: KitchenItemStatus): boolean {
  return (
    kitchenStatus === KitchenItemStatus.SENT ||
    kitchenStatus === KitchenItemStatus.PREPARING
  );
}

/** Fire efectivo: kitchenFireId o, en legacy, el id de la línea. */
export function effectiveKitchenFireId(line: {
  id: string;
  kitchenFireId?: string | null;
}): string {
  return line.kitchenFireId?.trim() || line.id;
}

/**
 * Líneas de un pedido (tanda) en una UP que pueden marcarse listo.
 * `fireId` puede ser kitchenFireId o line.id (legacy).
 */
export function selectLinesForKitchenFireReady<
  T extends {
    id: string;
    kitchenFireId?: string | null;
    productionUnitId?: string | null;
    kitchenStatus: KitchenItemStatus;
  },
>(lines: T[], fireId: string, productionUnitId: string): T[] {
  const target = fireId.trim();
  const unitId = productionUnitId.trim();
  if (!target || !unitId) return [];
  return lines.filter((line) => {
    if (line.productionUnitId !== unitId) return false;
    if (effectiveKitchenFireId(line) !== target) return false;
    return canMarkReady(line.kitchenStatus);
  });
}

export function canMarkServed(kitchenStatus: KitchenItemStatus): boolean {
  return kitchenStatus === KitchenItemStatus.READY;
}
