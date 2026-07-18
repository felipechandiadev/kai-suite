import { describe, expect, it } from "vitest";
import {
  canCancelDiningLine,
  canSendDiningLineToKitchen,
  groupDiningOrderLines,
} from "./group-dining-order-lines";
import type { PosDiningOrderLine } from "../types/dining-pos.types";

function line(
  partial: Partial<PosDiningOrderLine> & Pick<PosDiningOrderLine, "id" | "productVariantId">,
): PosDiningOrderLine {
  return {
    quantity: 1,
    kitchenStatus: "DRAFT",
    notes: null,
    ...partial,
  };
}

describe("groupDiningOrderLines", () => {
  it("groups same variant+status+notes and sums qty", () => {
    const groups = groupDiningOrderLines([
      line({ id: "1", productVariantId: "v1", quantity: 1 }),
      line({ id: "2", productVariantId: "v1", quantity: 2 }),
      line({ id: "3", productVariantId: "v1", kitchenStatus: "SENT", quantity: 1 }),
    ]);
    expect(groups).toHaveLength(2);
    const draft = groups.find((g) => g.kitchenStatus === "DRAFT");
    expect(draft?.quantityTotal).toBe(3);
    expect(draft?.lines).toHaveLength(2);
  });

  it("keeps notes as separate groups", () => {
    const groups = groupDiningOrderLines([
      line({ id: "1", productVariantId: "v1", notes: "sin cebolla" }),
      line({ id: "2", productVariantId: "v1", notes: null }),
    ]);
    expect(groups).toHaveLength(2);
  });

  it("excludes cancelled", () => {
    expect(
      groupDiningOrderLines([
        line({ id: "1", productVariantId: "v1", kitchenStatus: "CANCELLED" }),
      ]),
    ).toHaveLength(0);
  });
});

describe("dining line action guards", () => {
  it("send only draft; cancel draft/sent", () => {
    expect(canSendDiningLineToKitchen("DRAFT")).toBe(true);
    expect(canSendDiningLineToKitchen("SENT")).toBe(false);
    expect(canCancelDiningLine("DRAFT")).toBe(true);
    expect(canCancelDiningLine("SENT")).toBe(true);
    expect(canCancelDiningLine("READY")).toBe(false);
  });
});
