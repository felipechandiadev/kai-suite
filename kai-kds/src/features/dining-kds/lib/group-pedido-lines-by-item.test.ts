import { describe, expect, it } from "vitest";
import type { DiningOrderLineDto } from "../infrastructure/dining-kds.request";
import {
  groupPedidoLinesByItem,
  kdsItemGroupKey,
  kdsItemGroupTestId,
} from "./group-pedido-lines-by-item";

function line(
  partial: Partial<DiningOrderLineDto> &
    Pick<DiningOrderLineDto, "id" | "productVariantId">,
): DiningOrderLineDto {
  return {
    diningOrderId: "order-1",
    quantity: 1,
    kitchenStatus: "SENT",
    notes: null,
    ...partial,
  };
}

describe("groupPedidoLinesByItem", () => {
  it("consolidates three qty-1 lines of same variant into Cant 3", () => {
    const groups = groupPedidoLinesByItem([
      line({ id: "a", productVariantId: "v1", quantity: 1 }),
      line({ id: "b", productVariantId: "v1", quantity: 1 }),
      line({ id: "c", productVariantId: "v1", quantity: 1 }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.quantityTotal).toBe(3);
    expect(groups[0]?.lines).toHaveLength(3);
  });

  it("keeps different notes as separate groups", () => {
    const groups = groupPedidoLinesByItem([
      line({ id: "a", productVariantId: "v1", notes: "sin mayo" }),
      line({ id: "b", productVariantId: "v1", notes: null }),
    ]);
    expect(groups).toHaveLength(2);
  });

  it("sums quantity when a line already has qty > 1", () => {
    const groups = groupPedidoLinesByItem([
      line({ id: "a", productVariantId: "v1", quantity: 2 }),
      line({ id: "b", productVariantId: "v1", quantity: 1 }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.quantityTotal).toBe(3);
  });

  it("orders lines by sentToKitchenAt then id", () => {
    const groups = groupPedidoLinesByItem([
      line({
        id: "z",
        productVariantId: "v1",
        sentToKitchenAt: "2026-07-18T12:00:00Z",
      }),
      line({
        id: "a",
        productVariantId: "v1",
        sentToKitchenAt: "2026-07-18T11:00:00Z",
      }),
    ]);
    expect(groups[0]?.lines.map((l) => l.id)).toEqual(["a", "z"]);
  });
});

describe("kdsItemGroupKey / testId", () => {
  it("builds key like POS", () => {
    expect(kdsItemGroupKey({ productVariantId: "v1", notes: "  x  " })).toBe(
      "v1|x",
    );
  });

  it("sanitizes for data-test-id", () => {
    expect(kdsItemGroupTestId("v1|sin mayo")).toMatch(/^[\w-]+$/);
  });
});
