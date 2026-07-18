import type { DiningOrderLineDto } from "../infrastructure/dining-kds.request";

export type KdsItemGroup = {
  /** variantId|notes */
  key: string;
  productVariantId: string;
  notes: string | null;
  quantityTotal: number;
  /** Stable order: sentToKitchenAt ASC, then id. */
  lines: DiningOrderLineDto[];
};

export function kdsItemGroupKey(line: {
  productVariantId: string;
  notes?: string | null;
}): string {
  const notes = (line.notes ?? "").trim();
  return `${line.productVariantId}|${notes}`;
}

/** Sanitize group key for use in data-test-id attributes. */
export function kdsItemGroupTestId(key: string): string {
  return key.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 120);
}

/**
 * Within a Pedido/fire, consolidate identical variant+notes into one row with summed qty.
 */
export function groupPedidoLinesByItem(
  lines: DiningOrderLineDto[],
): KdsItemGroup[] {
  const map = new Map<string, KdsItemGroup>();

  const sorted = [...lines].sort((a, b) => {
    const ta = a.sentToKitchenAt ?? "";
    const tb = b.sentToKitchenAt ?? "";
    if (ta !== tb) return ta < tb ? -1 : 1;
    return a.id.localeCompare(b.id);
  });

  for (const line of sorted) {
    const key = kdsItemGroupKey(line);
    const qty = Number(line.quantity) || 0;
    const notes = (line.notes ?? "").trim() || null;
    const existing = map.get(key);
    if (existing) {
      existing.lines.push(line);
      existing.quantityTotal += qty;
      continue;
    }
    map.set(key, {
      key,
      productVariantId: line.productVariantId,
      notes,
      quantityTotal: qty,
      lines: [line],
    });
  }

  return [...map.values()];
}
