import { describe, expect, it } from "vitest";
import { groupDiningFiresForBoard } from "./group-dining-fires-for-board";
import type { PosDiningOrderLine } from "../types/dining-pos.types";

describe("groupDiningFiresForBoard", () => {
  it("splits preparing, kitchenReady and pickupReady fires", () => {
    const lines: PosDiningOrderLine[] = [
      {
        id: "l1",
        productVariantId: "v1",
        quantity: 1,
        kitchenStatus: "SENT",
        kitchenFireId: "f1",
        kitchenFireNumber: 10,
      },
      {
        id: "l2",
        productVariantId: "v2",
        quantity: 1,
        kitchenStatus: "READY",
        kitchenFireId: "f2",
        kitchenFireNumber: 11,
      },
      {
        id: "l3",
        productVariantId: "v3",
        quantity: 1,
        kitchenStatus: "READY_FOR_PICKUP",
        kitchenFireId: "f3",
        kitchenFireNumber: 12,
      },
    ];
    const g = groupDiningFiresForBoard(lines);
    expect(g.preparing).toHaveLength(1);
    expect(g.preparing[0]?.kitchenFireNumber).toBe(10);
    expect(g.kitchenReady).toHaveLength(1);
    expect(g.kitchenReady[0]?.kitchenFireNumber).toBe(11);
    expect(g.pickupReady).toHaveLength(1);
    expect(g.pickupReady[0]?.kitchenFireNumber).toBe(12);
  });
});
