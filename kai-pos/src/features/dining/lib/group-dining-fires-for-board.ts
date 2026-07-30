import type {
  KitchenItemStatus,
  PosDiningOrderLine,
} from "../types/dining-pos.types";

export type DiningBoardFireChip = {
  fireId: string;
  kitchenFireNumber: number | null;
  lineCount: number;
};

function effectiveFireId(line: PosDiningOrderLine): string {
  return line.kitchenFireId?.trim() || line.id;
}

const PREPARING: Set<KitchenItemStatus> = new Set(["SENT", "PREPARING"]);

/**
 * Agrupa fires de una cuenta para badges del POS:
 * preparing → kitchenReady (ámbar) → pickupReady (verde / Kai Board).
 */
export function groupDiningFiresForBoard(lines: PosDiningOrderLine[]): {
  preparing: DiningBoardFireChip[];
  kitchenReady: DiningBoardFireChip[];
  pickupReady: DiningBoardFireChip[];
} {
  const byFire = new Map<string, PosDiningOrderLine[]>();
  for (const line of lines) {
    if (line.kitchenStatus === "CANCELLED" || line.kitchenStatus === "DRAFT") {
      continue;
    }
    const fireId = effectiveFireId(line);
    const list = byFire.get(fireId) ?? [];
    list.push(line);
    byFire.set(fireId, list);
  }

  const preparing: DiningBoardFireChip[] = [];
  const kitchenReady: DiningBoardFireChip[] = [];
  const pickupReady: DiningBoardFireChip[] = [];

  for (const [fireId, fireLines] of byFire) {
    const hasPreparing = fireLines.some((l) => PREPARING.has(l.kitchenStatus));
    const kitchenReadyCount = fireLines.filter(
      (l) => l.kitchenStatus === "READY",
    ).length;
    const pickupReadyCount = fireLines.filter(
      (l) => l.kitchenStatus === "READY_FOR_PICKUP",
    ).length;
    const kitchenFireNumber =
      fireLines.find((l) => l.kitchenFireNumber != null)?.kitchenFireNumber ??
      null;

    if (hasPreparing) {
      preparing.push({
        fireId,
        kitchenFireNumber,
        lineCount: fireLines.filter((l) => PREPARING.has(l.kitchenStatus)).length,
      });
    } else if (kitchenReadyCount > 0) {
      kitchenReady.push({
        fireId,
        kitchenFireNumber,
        lineCount: kitchenReadyCount,
      });
    } else if (pickupReadyCount > 0) {
      pickupReady.push({
        fireId,
        kitchenFireNumber,
        lineCount: pickupReadyCount,
      });
    }
  }

  const byNum = (a: DiningBoardFireChip, b: DiningBoardFireChip) =>
    (a.kitchenFireNumber ?? 999999) - (b.kitchenFireNumber ?? 999999);
  preparing.sort(byNum);
  kitchenReady.sort(byNum);
  pickupReady.sort(byNum);
  return { preparing, kitchenReady, pickupReady };
}
