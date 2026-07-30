import type { DiningOrderLineDto } from "../infrastructure/dining.request";

export type WaiterFireChip = {
  fireId: string;
  kitchenFireNumber: number | null;
  lineCount: number;
};

function effectiveFireId(line: DiningOrderLineDto): string {
  return line.kitchenFireId?.trim() || line.id;
}

const PREPARING = new Set(["SENT", "PREPARING"]);

/**
 * Fires para badges mesero: preparing (info) | kitchenReady (ámbar → entregado).
 */
export function groupWaiterFiresForDelivery(lines: DiningOrderLineDto[]): {
  preparing: WaiterFireChip[];
  kitchenReady: WaiterFireChip[];
} {
  const byFire = new Map<string, DiningOrderLineDto[]>();
  for (const line of lines) {
    if (line.kitchenStatus === "CANCELLED" || line.kitchenStatus === "DRAFT") {
      continue;
    }
    const fireId = effectiveFireId(line);
    const list = byFire.get(fireId) ?? [];
    list.push(line);
    byFire.set(fireId, list);
  }

  const preparing: WaiterFireChip[] = [];
  const kitchenReady: WaiterFireChip[] = [];

  for (const [fireId, fireLines] of byFire) {
    const hasPreparing = fireLines.some((l) => PREPARING.has(l.kitchenStatus));
    const kitchenReadyCount = fireLines.filter(
      (l) => l.kitchenStatus === "READY",
    ).length;
    const kitchenFireNumber =
      fireLines.find((l) => l.kitchenFireNumber != null)?.kitchenFireNumber ??
      null;

    if (hasPreparing) {
      preparing.push({
        fireId,
        kitchenFireNumber,
        lineCount: fireLines.filter((l) => PREPARING.has(l.kitchenStatus))
          .length,
      });
    } else if (kitchenReadyCount > 0) {
      kitchenReady.push({
        fireId,
        kitchenFireNumber,
        lineCount: kitchenReadyCount,
      });
    }
  }

  const byNum = (a: WaiterFireChip, b: WaiterFireChip) =>
    (a.kitchenFireNumber ?? 999999) - (b.kitchenFireNumber ?? 999999);
  preparing.sort(byNum);
  kitchenReady.sort(byNum);
  return { preparing, kitchenReady };
}
