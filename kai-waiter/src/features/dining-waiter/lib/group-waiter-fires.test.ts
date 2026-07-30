import { describe, expect, it } from "vitest";
import { groupWaiterFiresForDelivery } from "./group-waiter-fires";
import type { DiningOrderLineDto } from "../infrastructure/dining.request";

function line(
  partial: Partial<DiningOrderLineDto> & Pick<DiningOrderLineDto, "id">,
): DiningOrderLineDto {
  return {
    diningOrderId: "o1",
    productVariantId: "v1",
    quantity: 1,
    kitchenStatus: "SENT",
    ...partial,
  };
}

describe("groupWaiterFiresForDelivery", () => {
  it("splits preparing and kitchenReady", () => {
    const g = groupWaiterFiresForDelivery([
      line({
        id: "l1",
        kitchenStatus: "SENT",
        kitchenFireId: "f1",
        kitchenFireNumber: 10,
      }),
      line({
        id: "l2",
        kitchenStatus: "READY",
        kitchenFireId: "f2",
        kitchenFireNumber: 11,
      }),
    ]);
    expect(g.preparing).toHaveLength(1);
    expect(g.preparing[0]?.kitchenFireNumber).toBe(10);
    expect(g.kitchenReady).toHaveLength(1);
    expect(g.kitchenReady[0]?.kitchenFireNumber).toBe(11);
  });

  it("does not treat READY_FOR_PICKUP as kitchenReady amber", () => {
    const g = groupWaiterFiresForDelivery([
      line({
        id: "l1",
        kitchenStatus: "READY_FOR_PICKUP",
        kitchenFireId: "f1",
        kitchenFireNumber: 5,
      }),
    ]);
    expect(g.kitchenReady).toHaveLength(0);
    expect(g.preparing).toHaveLength(0);
  });
});
