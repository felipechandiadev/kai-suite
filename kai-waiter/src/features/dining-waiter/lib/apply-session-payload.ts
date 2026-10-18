import type {
  DiningOrderDto,
  DiningOrderLineDto,
} from "../infrastructure/dining.request";
import { isWaiterDiningOrderInactive } from "./group-waiter-order-lines";

/** Evento `dining.session.updated` emitido por kai-core. */
export type DiningSessionUpdatedPayload = {
  branchId: string;
  salonId?: string | null;
  orderId: string;
  kind: string;
  status: string;
  displayLabel: string;
  diningTableId?: string | null;
  openedByUserId?: string | null;
  openedAt?: string | null;
  updatedAt?: string | null;
  items: Array<{
    id: string;
    productVariantId: string;
    quantity: number;
    notes?: string | null;
    kitchenStatus: string;
    productionUnitId?: string | null;
    kitchenFireId?: string | null;
    kitchenFireNumber?: number | null;
    addons?: Array<{
      id?: string;
      addonVariantId?: string;
      name?: string;
      quantity: number;
    }>;
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function parseSessionPayload(raw: unknown): DiningSessionUpdatedPayload | null {
  if (!isRecord(raw)) return null;
  if (
    !isNonEmptyString(raw.orderId) ||
    !isNonEmptyString(raw.branchId) ||
    !isNonEmptyString(raw.status) ||
    !Array.isArray(raw.items)
  ) {
    return null;
  }
  const itemsValid = raw.items.every(
    (item) =>
      isRecord(item) &&
      isNonEmptyString(item.id) &&
      isNonEmptyString(item.productVariantId) &&
      isNonEmptyString(item.kitchenStatus),
  );
  if (!itemsValid) return null;
  return raw as unknown as DiningSessionUpdatedPayload;
}

/** Conserva campos que el payload no trae (nombre de variante, mesa, etc.). */
export function mergeOrderFromPayload(
  prev: DiningOrderDto | undefined,
  payload: DiningSessionUpdatedPayload,
): DiningOrderDto {
  const prevLines = new Map((prev?.lines ?? []).map((line) => [line.id, line]));
  const lines: DiningOrderLineDto[] = payload.items.map((item) => ({
    ...prevLines.get(item.id),
    id: item.id,
    diningOrderId: payload.orderId,
    productVariantId: item.productVariantId,
    quantity: item.quantity,
    notes: item.notes ?? null,
    productionUnitId: item.productionUnitId ?? null,
    kitchenStatus: item.kitchenStatus,
    kitchenFireId: item.kitchenFireId ?? null,
    kitchenFireNumber: item.kitchenFireNumber ?? null,
    addons: (item.addons ?? []).map((addon) => ({
      id: addon.id,
      addonVariantId: addon.addonVariantId,
      name: addon.name,
      displayName: addon.name,
      quantity: addon.quantity,
    })),
  }));
  return {
    ...prev,
    id: payload.orderId,
    branchId: payload.branchId,
    kind: payload.kind,
    status: payload.status,
    displayLabel: payload.displayLabel,
    diningTableId: payload.diningTableId ?? null,
    diningRoomId: payload.salonId ?? prev?.diningRoomId ?? null,
    openedAt: payload.openedAt ?? prev?.openedAt ?? new Date().toISOString(),
    openedByUserId:
      payload.openedByUserId !== undefined
        ? payload.openedByUserId
        : (prev?.openedByUserId ?? null),
    lines,
  };
}

export function upsertOrder(
  orders: DiningOrderDto[],
  order: DiningOrderDto,
): DiningOrderDto[] {
  if (isWaiterDiningOrderInactive(order.status)) {
    return orders.filter((o) => o.id !== order.id);
  }
  const index = orders.findIndex((o) => o.id === order.id);
  if (index === -1) return [order, ...orders];
  const next = orders.slice();
  next[index] = order;
  return next;
}

/** Aplica eventos de la sucursal a la lista de cuentas activas; ignora otras sucursales. */
export function applySessionPayloads(
  orders: DiningOrderDto[],
  payloads: DiningSessionUpdatedPayload[],
  branchId: string,
): DiningOrderDto[] {
  let next = orders;
  for (const payload of payloads) {
    if (branchId && payload.branchId !== branchId) continue;
    const prev = next.find((o) => o.id === payload.orderId);
    next = upsertOrder(next, mergeOrderFromPayload(prev, payload));
  }
  return next;
}
