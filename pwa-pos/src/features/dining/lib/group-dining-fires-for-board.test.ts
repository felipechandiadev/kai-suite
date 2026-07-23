import { groupDiningFiresForBoard } from "./group-dining-fires-for-board";
import type { PosDiningOrderLine } from "../types/dining-pos.types";

describe("groupDiningFiresForBoard", () => {
  it("splits preparing and ready fires", () => {
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
    ];
    const g = groupDiningFiresForBoard(lines);
    expect(g.preparing).toHaveLength(1);
    expect(g.preparing[0]?.kitchenFireNumber).toBe(10);
    expect(g.ready).toHaveLength(1);
    expect(g.ready[0]?.kitchenFireNumber).toBe(11);
  });
});
