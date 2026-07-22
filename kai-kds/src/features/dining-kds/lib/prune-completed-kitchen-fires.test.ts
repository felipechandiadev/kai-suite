import { describe, expect, it } from "vitest";
import { pruneCompletedKitchenFires } from "./prune-completed-kitchen-fires";
import type { DiningOrderLineDto } from "../infrastructure/dining-kds.request";

function line(
  partial: Partial<DiningOrderLineDto> &
    Pick<DiningOrderLineDto, "id" | "productVariantId" | "kitchenStatus">,
): DiningOrderLineDto {
  return {
    diningOrderId: "o1",
    quantity: 1,
    kitchenFireId: "fire-a",
    productionUnitId: "u1",
    ...partial,
  };
}

describe("pruneCompletedKitchenFires", () => {
  it("keeps READY lines when the fire still has pending items", () => {
    const next = pruneCompletedKitchenFires([
      line({
        id: "1",
        productVariantId: "v1",
        kitchenStatus: "READY",
        kitchenFireId: "fire-a",
      }),
      line({
        id: "2",
        productVariantId: "v2",
        kitchenStatus: "SENT",
        kitchenFireId: "fire-a",
      }),
    ]);
    expect(next.map((l) => l.id).sort()).toEqual(["1", "2"]);
  });

  it("removes the whole fire when all lines are READY", () => {
    const next = pruneCompletedKitchenFires([
      line({
        id: "1",
        productVariantId: "v1",
        kitchenStatus: "READY",
        kitchenFireId: "fire-a",
      }),
      line({
        id: "2",
        productVariantId: "v2",
        kitchenStatus: "READY",
        kitchenFireId: "fire-a",
      }),
      line({
        id: "3",
        productVariantId: "v3",
        kitchenStatus: "SENT",
        kitchenFireId: "fire-b",
      }),
    ]);
    expect(next.map((l) => l.id)).toEqual(["3"]);
  });
});
