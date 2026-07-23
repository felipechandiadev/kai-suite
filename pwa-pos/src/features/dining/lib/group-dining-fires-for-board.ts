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
 * Agrupa fires de una cuenta para badges clickables del POS / Kai Board.
 */
export function groupDiningFiresForBoard(lines: PosDiningOrderLine[]): {
  preparing: DiningBoardFireChip[];
  ready: DiningBoardFireChip[];
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
  const ready: DiningBoardFireChip[] = [];

  for (const [fireId, fireLines] of byFire) {
    const hasPreparing = fireLines.some((l) => PREPARING.has(l.kitchenStatus));
    const readyCount = fireLines.filter((l) => l.kitchenStatus === "READY").length;
    const kitchenFireNumber =
      fireLines.find((l) => l.kitchenFireNumber != null)?.kitchenFireNumber ??
      null;

    if (hasPreparing) {
      preparing.push({
        fireId,
        kitchenFireNumber,
        lineCount: fireLines.filter((l) => PREPARING.has(l.kitchenStatus)).length,
      });
    } else if (readyCount > 0) {
      ready.push({
        fireId,
        kitchenFireNumber,
        lineCount: readyCount,
      });
    }
  }

  const byNum = (a: DiningBoardFireChip, b: DiningBoardFireChip) =>
    (a.kitchenFireNumber ?? 999999) - (b.kitchenFireNumber ?? 999999);
  preparing.sort(byNum);
  ready.sort(byNum);
  return { preparing, ready };
}
