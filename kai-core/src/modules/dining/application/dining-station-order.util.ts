import {
  DiningStationOrderStatus,
  KitchenItemStatus,
} from '../domain/dining.enums';

const TERMINAL_KITCHEN_STATUSES = new Set<KitchenItemStatus>([
  KitchenItemStatus.READY,
  KitchenItemStatus.READY_FOR_PICKUP,
  KitchenItemStatus.SERVED,
  KitchenItemStatus.CANCELLED,
]);

export function isTerminalKitchenStatus(
  status: KitchenItemStatus,
): boolean {
  return TERMINAL_KITCHEN_STATUSES.has(status);
}

export function deriveStationOrderStatus(
  lineStatuses: KitchenItemStatus[],
): DiningStationOrderStatus {
  if (lineStatuses.length === 0) {
    return DiningStationOrderStatus.OPEN;
  }
  if (lineStatuses.every((s) => s === KitchenItemStatus.CANCELLED)) {
    return DiningStationOrderStatus.CANCELLED;
  }
  if (lineStatuses.every((s) => isTerminalKitchenStatus(s))) {
    return DiningStationOrderStatus.COMPLETED;
  }
  return DiningStationOrderStatus.OPEN;
}

/** Duración de prep de un ítem (ms), o null si falta timestamp. */
export function itemPrepDurationMs(params: {
  sentToKitchenAt?: Date | string | null;
  readyAt?: Date | string | null;
}): number | null {
  if (!params.sentToKitchenAt || !params.readyAt) return null;
  const sent = new Date(params.sentToKitchenAt).getTime();
  const ready = new Date(params.readyAt).getTime();
  if (!Number.isFinite(sent) || !Number.isFinite(ready) || ready < sent) {
    return null;
  }
  return ready - sent;
}

/**
 * Duración de prep del pedido en el scope de una UP:
 * max(readyAt) − min(sentToKitchenAt) sobre líneas no canceladas con readyAt.
 */
export function stationOrderPrepDurationMsForUnit(
  lines: Array<{
    kitchenStatus: KitchenItemStatus;
    sentToKitchenAt?: Date | string | null;
    readyAt?: Date | string | null;
  }>,
): number | null {
  const active = lines.filter(
    (l) => l.kitchenStatus !== KitchenItemStatus.CANCELLED,
  );
  if (active.length === 0) return null;
  if (active.some((l) => !l.readyAt || !l.sentToKitchenAt)) return null;

  let minSent = Infinity;
  let maxReady = -Infinity;
  for (const l of active) {
    const sent = new Date(l.sentToKitchenAt!).getTime();
    const ready = new Date(l.readyAt!).getTime();
    if (!Number.isFinite(sent) || !Number.isFinite(ready)) return null;
    minSent = Math.min(minSent, sent);
    maxReady = Math.max(maxReady, ready);
  }
  if (maxReady < minSent) return null;
  return maxReady - minSent;
}

export function formatPrepDurationMs(ms: number | null): string | null {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return null;
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
