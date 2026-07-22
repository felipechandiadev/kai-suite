import { describe, expect, it } from "vitest";
import {
  canCancelDiningLine,
  canSendDiningLineToKitchen,
  diningLineGroupAllReady,
  diningLineGroupKitchenFireNumbers,
  diningOrderAllKitchenReady,
  diningProductNeedsKitchen,
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
  it("groups same variant+notes across kitchen statuses and sums qty", () => {
    const groups = groupDiningOrderLines([
      line({ id: "1", productVariantId: "v1", quantity: 1 }),
      line({ id: "2", productVariantId: "v1", quantity: 2 }),
      line({ id: "3", productVariantId: "v1", kitchenStatus: "SENT", quantity: 1 }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.quantityTotal).toBe(4);
    expect(groups[0]?.lines).toHaveLength(3);
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

  it("collects kitchen fire numbers from sent lines", () => {
    const groups = groupDiningOrderLines([
      line({
        id: "1",
        productVariantId: "v1",
        kitchenStatus: "SENT",
        kitchenFireNumber: 3,
      }),
      line({
        id: "2",
        productVariantId: "v1",
        kitchenStatus: "READY",
        kitchenFireNumber: 1,
      }),
      line({
        id: "3",
        productVariantId: "v1",
        kitchenStatus: "DRAFT",
        kitchenFireNumber: 9,
      }),
    ]);
    expect(diningLineGroupKitchenFireNumbers(groups[0]!)).toEqual([1, 3]);
  });
});

describe("diningLineGroupAllReady", () => {
  it("true only when every line is READY or SERVED", () => {
    const mixed = groupDiningOrderLines([
      line({ id: "1", productVariantId: "v1", kitchenStatus: "READY" }),
      line({ id: "2", productVariantId: "v1", kitchenStatus: "SENT" }),
    ])[0]!;
    expect(diningLineGroupAllReady(mixed)).toBe(false);

    const ready = groupDiningOrderLines([
      line({ id: "1", productVariantId: "v1", kitchenStatus: "READY" }),
      line({ id: "2", productVariantId: "v1", kitchenStatus: "SERVED" }),
    ])[0]!;
    expect(diningLineGroupAllReady(ready)).toBe(true);
  });
});

describe("diningOrderAllKitchenReady", () => {
  it("requires all active sent lines ready and no drafts", () => {
    expect(
      diningOrderAllKitchenReady([
        { kitchenStatus: "READY" },
        { kitchenStatus: "READY" },
      ]),
    ).toBe(true);
    expect(
      diningOrderAllKitchenReady([
        { kitchenStatus: "READY" },
        { kitchenStatus: "DRAFT" },
      ]),
    ).toBe(false);
    expect(
      diningOrderAllKitchenReady([
        { kitchenStatus: "READY" },
        { kitchenStatus: "SENT" },
      ]),
    ).toBe(false);
  });
});

describe("diningProductNeedsKitchen", () => {
  it("true for kitchen product types", () => {
    expect(diningProductNeedsKitchen("PREPARADO")).toBe(true);
    expect(diningProductNeedsKitchen("elaborado")).toBe(true);
    expect(diningProductNeedsKitchen("MANUFACTURADO")).toBe(true);
  });

  it("false for physical and unknown", () => {
    expect(diningProductNeedsKitchen("PHYSICAL")).toBe(false);
    expect(diningProductNeedsKitchen(null)).toBe(false);
    expect(diningProductNeedsKitchen("")).toBe(false);
  });
});

describe("dining line action guards", () => {
  it("send only draft; cancel draft/sent", () => {
    expect(canSendDiningLineToKitchen("DRAFT")).toBe(true);
    expect(canSendDiningLineToKitchen("SENT")).toBe(false);
    expect(canSendDiningLineToKitchen("DRAFT", "PREPARADO")).toBe(true);
    expect(canSendDiningLineToKitchen("DRAFT", "PHYSICAL")).toBe(false);
    expect(canSendDiningLineToKitchen("DRAFT", null)).toBe(false);
    expect(canSendDiningLineToKitchen("SENT", "PREPARADO")).toBe(false);
    expect(canCancelDiningLine("DRAFT")).toBe(true);
    expect(canCancelDiningLine("SENT")).toBe(true);
    expect(canCancelDiningLine("READY")).toBe(false);
  });
});
