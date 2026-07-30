import type {
  KitchenItemStatus,
  PosDiningOrderLine,
} from "@/features/dining/types/dining-pos.types";
import { kitchenItemStatusLabel } from "@/features/dining/lib/dining-status-labels";

export type DiningLineGroup = {
  /** variantId|notes */
  key: string;
  productVariantId: string;
  notes: string | null;
  lines: PosDiningOrderLine[];
  quantityTotal: number;
};

export function diningLineGroupKey(line: PosDiningOrderLine): string {
  const notes = (line.notes ?? "").trim();
  return `${line.productVariantId}|${notes}`;
}

/** Misma regla que backend: solo PREPARADO va a comanda / KDS. */
export function diningProductNeedsKitchen(productType?: string | null): boolean {
  return String(productType ?? "").trim().toUpperCase() === "PREPARADO";
}

export function canSendDiningLineToKitchen(
  status: KitchenItemStatus,
  productType?: string | null,
): boolean {
  if (status !== "DRAFT") return false;
  if (productType === undefined) return true;
  return diningProductNeedsKitchen(productType);
}

export function canCancelDiningLine(status: KitchenItemStatus): boolean {
  return status === "DRAFT" || status === "SENT";
}

export function isKitchenReadyStatus(status: KitchenItemStatus): boolean {
  return (
    status === "READY" ||
    status === "READY_FOR_PICKUP" ||
    status === "SERVED"
  );
}

export function diningLineGroupAllReady(group: DiningLineGroup): boolean {
  return (
    group.lines.length > 0 &&
    group.lines.every((l) => isKitchenReadyStatus(l.kitchenStatus))
  );
}

/** Resumen de estado de cocina para cabecera de grupo (puede ser mixto). */
export function diningLineGroupStatusLabel(group: DiningLineGroup): string {
  if (group.lines.length === 0) return "";
  const statuses = new Set(group.lines.map((l) => l.kitchenStatus));
  if (statuses.size === 1) {
    return kitchenItemStatusLabel(group.lines[0]!.kitchenStatus);
  }
  const readyCount = group.lines.filter((l) =>
    isKitchenReadyStatus(l.kitchenStatus),
  ).length;
  if (readyCount > 0 && readyCount < group.lines.length) {
    return `Parcial listo (${readyCount}/${group.lines.length})`;
  }
  return "Estados mixtos";
}

/**
 * Cuenta “toda lista”: hay ítems enviados, ninguno en cocina, ninguno en borrador,
 * y todos los activos no-cancelados están READY/SERVED.
 */
export function diningOrderAllKitchenReady(
  lines: Array<{ kitchenStatus: KitchenItemStatus }>,
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
  return active.every((l) => isKitchenReadyStatus(l.kitchenStatus));
}

/**
 * Receipt / Cobrar: si hay PREPARADO activos, todos READY/SERVED.
 * Sin PREPARADO → permitido.
 */
export function diningOrderCanBillOrCharge(
  lines: Array<{ productVariantId: string; kitchenStatus: KitchenItemStatus }>,
  productTypeByVariantId: Record<string, string | null | undefined>,
): boolean {
  const preparado = lines.filter((line) => {
    if (line.kitchenStatus === "CANCELLED") return false;
    return diningProductNeedsKitchen(productTypeByVariantId[line.productVariantId]);
  });
  if (preparado.length === 0) return true;
  return preparado.every((line) => isKitchenReadyStatus(line.kitchenStatus));
}

/** Números de pedido (fire) presentes en líneas ya enviadas del grupo. */
export function diningLineGroupKitchenFireNumbers(
  group: DiningLineGroup,
): number[] {
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

/** Agrupa por variante + notas (estados de cocina pueden mezclarse en el grupo). */
export function groupDiningOrderLines(
  lines: PosDiningOrderLine[],
): DiningLineGroup[] {
  const map = new Map<string, DiningLineGroup>();
  for (const line of lines) {
    if (line.kitchenStatus === "CANCELLED") continue;
    const key = diningLineGroupKey(line);
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
