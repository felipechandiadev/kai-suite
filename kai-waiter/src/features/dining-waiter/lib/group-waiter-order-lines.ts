/**
 * Agrupa líneas de comanda waiter (misma regla variante+notas que POS).
 */

export type WaiterOrderLineLike = {
  id: string;
  productVariantId: string;
  quantity: number | string;
  notes?: string | null;
  kitchenStatus: string;
  kitchenFireNumber?: number | null;
  productVariant?: { name?: string; sku?: string };
};

export type WaiterLineGroup = {
  key: string;
  productVariantId: string;
  notes: string | null;
  lines: WaiterOrderLineLike[];
  quantityTotal: number;
};

export function waiterLineGroupKey(line: WaiterOrderLineLike): string {
  const notes = (line.notes ?? "").trim();
  return `${line.productVariantId}|${notes}`;
}

export function waiterProductNeedsKitchen(productType?: string | null): boolean {
  return String(productType ?? "").trim().toUpperCase() === "PREPARADO";
}

export function canSendWaiterLineToKitchen(
  status: string,
  productType?: string | null,
): boolean {
  if (status !== "DRAFT") return false;
  if (productType === undefined) return true;
  return waiterProductNeedsKitchen(productType);
}

/** Igual que POS: DRAFT o SENT. */
export function canCancelWaiterLine(status: string): boolean {
  return status === "DRAFT" || status === "SENT";
}

/** @deprecated usar canCancelWaiterLine */
export function canCancelWaiterDraftLine(status: string): boolean {
  return canCancelWaiterLine(status);
}

export function isWaiterKitchenReadyStatus(status: string): boolean {
  return (
    status === "READY" ||
    status === "READY_FOR_PICKUP" ||
    status === "SERVED"
  );
}

export function waiterLineGroupAllReady(group: WaiterLineGroup): boolean {
  return (
    group.lines.length > 0 &&
    group.lines.every((l) => isWaiterKitchenReadyStatus(l.kitchenStatus))
  );
}

export function waiterKitchenStatusLabel(status: string): string {
  const map: Record<string, string> = {
    DRAFT: "Borrador",
    SENT: "En cocina",
    PREPARING: "Preparando",
    READY: "Listo cocina",
    READY_FOR_PICKUP: "Listo para retirar",
    SERVED: "Servido",
    CANCELLED: "Cancelado",
  };
  return map[status] ?? status;
}

export function waiterOrderStatusLabel(status: string): string {
  const map: Record<string, string> = {
    FREE: "Libre",
    OPEN: "Abierta",
    SENT: "En cocina",
    PARTIAL_READY: "Parcial listo",
    READY: "Listo",
    BILLING: "Por cobrar",
    CLOSED: "Cerrada",
  };
  return map[status] ?? status;
}

export function waiterLineGroupStatusLabel(group: WaiterLineGroup): string {
  if (group.lines.length === 0) return "";
  const statuses = new Set(group.lines.map((l) => l.kitchenStatus));
  if (statuses.size === 1) {
    return waiterKitchenStatusLabel(group.lines[0]!.kitchenStatus);
  }
  const readyCount = group.lines.filter((l) =>
    isWaiterKitchenReadyStatus(l.kitchenStatus),
  ).length;
  if (readyCount > 0 && readyCount < group.lines.length) {
    return `Parcial listo (${readyCount}/${group.lines.length})`;
  }
  return "Estados mixtos";
}

export function waiterLineGroupFireNumbers(group: WaiterLineGroup): number[] {
  const nums = new Set<number>();
  for (const line of group.lines) {
    if (line.kitchenStatus === "DRAFT" || line.kitchenStatus === "CANCELLED") {
      continue;
    }
    const n = line.kitchenFireNumber;
    if (typeof n === "number" && Number.isFinite(n) && n > 0) {
      nums.add(n);
    }
  }
  return [...nums].sort((a, b) => a - b);
}

export function waiterOrderAllKitchenReady(
  lines: Array<{ kitchenStatus: string }>,
): boolean {
  const active = lines.filter((l) => l.kitchenStatus !== "CANCELLED");
  if (active.length === 0) return false;
  if (active.some((l) => l.kitchenStatus === "DRAFT")) return false;
  if (
    active.some(
      (l) => l.kitchenStatus === "SENT" || l.kitchenStatus === "PREPARING",
    )
  ) {
    return false;
  }
  return active.every((l) => isWaiterKitchenReadyStatus(l.kitchenStatus));
}

export function kitchenProgressFromLines(
  lines: Array<{ kitchenStatus: string }>,
) {
  const active = lines.filter((l) => l.kitchenStatus !== "CANCELLED");
  const total = active.length;
  const inKitchen = active.filter(
    (l) => l.kitchenStatus === "SENT" || l.kitchenStatus === "PREPARING",
  ).length;
  const ready = active.filter((l) =>
    isWaiterKitchenReadyStatus(l.kitchenStatus),
  ).length;
  return { total, inKitchen, ready };
}

export function groupWaiterOrderLines(
  lines: WaiterOrderLineLike[],
): WaiterLineGroup[] {
  const map = new Map<string, WaiterLineGroup>();
  for (const line of lines) {
    if (line.kitchenStatus === "CANCELLED") continue;
    const key = waiterLineGroupKey(line);
    const existing = map.get(key);
    const qty = Number(line.quantity) || 0;
    if (existing) {
      existing.lines.push(line);
      existing.quantityTotal += qty;
      continue;
    }
    map.set(key, {
      key,
      productVariantId: line.productVariantId,
      notes: (line.notes ?? "").trim() || null,
      lines: [line],
      quantityTotal: qty,
    });
  }
  return [...map.values()];
}
