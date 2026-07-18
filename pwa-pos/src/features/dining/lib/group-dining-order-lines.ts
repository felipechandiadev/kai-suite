import type {
  KitchenItemStatus,
  PosDiningOrderLine,
} from "@/features/dining/types/dining-pos.types";

export type DiningLineGroup = {
  /** variantId|status|notes */
  key: string;
  productVariantId: string;
  kitchenStatus: KitchenItemStatus;
  notes: string | null;
  lines: PosDiningOrderLine[];
  quantityTotal: number;
};

export function diningLineGroupKey(line: PosDiningOrderLine): string {
  const notes = (line.notes ?? "").trim();
  return `${line.productVariantId}|${line.kitchenStatus}|${notes}`;
}

export function canSendDiningLineToKitchen(status: KitchenItemStatus): boolean {
  return status === "DRAFT";
}

export function canCancelDiningLine(status: KitchenItemStatus): boolean {
  return status === "DRAFT" || status === "SENT";
}

/** Agrupa por variante + estado de cocina + notas (grupos homogéneos para acciones). */
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
      kitchenStatus: line.kitchenStatus,
      notes: (line.notes ?? "").trim() || null,
      lines: [line],
      quantityTotal: qty,
    });
  }
  return [...map.values()];
}
