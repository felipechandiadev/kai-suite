import { DiningOrderStatus, DiningOrderKind, KitchenItemStatus } from '../domain/dining.enums';

const ACTIVE_KITCHEN_STATUSES = new Set<KitchenItemStatus>([
  KitchenItemStatus.SENT,
  KitchenItemStatus.PREPARING,
]);

const READY_KITCHEN_STATUSES = new Set<KitchenItemStatus>([
  KitchenItemStatus.READY,
  KitchenItemStatus.READY_FOR_PICKUP,
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
    status === DiningOrderStatus.READY
  );
}

/** Solo PREPARADO entra a comanda / KDS. */
export function lineNeedsKitchenComanda(productType?: string | null): boolean {
  return String(productType ?? '')
    .trim()
    .toUpperCase() === 'PREPARADO';
}

/**
 * Receipt / cobro: si hay PREPARADO activos, todos deben estar READY/SERVED.
 * Sin PREPARADO (solo PHYSICAL/ELABORADO/MANUFACTURADO) → permitido.
 */
export function canIssueBillOrCharge(
  lines: Array<{ productVariantId: string; kitchenStatus: KitchenItemStatus }>,
  productTypeByVariantId: Record<string, string | null | undefined>,
): boolean {
  const preparado = lines.filter((line) => {
    if (line.kitchenStatus === KitchenItemStatus.CANCELLED) return false;
    const type = productTypeByVariantId[line.productVariantId];
    return lineNeedsKitchenComanda(type);
  });
  if (preparado.length === 0) return true;
  return preparado.every((line) => READY_KITCHEN_STATUSES.has(line.kitchenStatus));
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

/** Cantidad de líneas aún pendientes (SENT/PREPARING) en un fire + UP. */
export function countPendingKitchenLines(
  lines: Array<{
    id: string;
    kitchenFireId?: string | null;
    productionUnitId?: string | null;
    kitchenStatus: KitchenItemStatus;
  }>,
  fireId: string,
  productionUnitId: string,
): number {
  return selectLinesForKitchenFireReady(lines, fireId, productionUnitId).length;
}

/** Líneas READY (no servidas/canceladas) de un fire + UP — resumen de pedido listo. */
export function selectReadyLinesForKitchenFire<
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
    return line.kitchenStatus === KitchenItemStatus.READY;
  });
}

export function canMarkReadyForPickup(
  kitchenStatus: KitchenItemStatus,
): boolean {
  return kitchenStatus === KitchenItemStatus.READY;
}

/**
 * POS: READY_FOR_PICKUP → SERVED.
 * Mesa (mesero): READY → SERVED (equivale al listo-para-retirar del mostrador).
 */
export function canMarkServed(
  kitchenStatus: KitchenItemStatus,
  orderKind?: DiningOrderKind,
): boolean {
  if (kitchenStatus === KitchenItemStatus.READY_FOR_PICKUP) return true;
  if (
    kitchenStatus === KitchenItemStatus.READY &&
    orderKind === DiningOrderKind.TABLE
  ) {
    return true;
  }
  return false;
}
