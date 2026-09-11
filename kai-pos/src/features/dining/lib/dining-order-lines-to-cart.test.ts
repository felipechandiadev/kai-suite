import { describe, expect, it } from "vitest";
import { diningOrderLinesToCart } from "./dining-order-lines-to-cart";
import type { PosDiningOrderLine } from "../types/dining-pos.types";
import type { PosProductSearchItem } from "@/features/pos-products/types/pos-product.types";

function item(variantId: string, name: string): PosProductSearchItem {
  return {
    variantId,
    productId: `p-${variantId}`,
    productName: name,
    variantName: null,
    sku: variantId,
    unitPrice: 1000,
    unitPriceWithTax: 1190,
    quantity: 1,
  } as PosProductSearchItem;
}

describe("diningOrderLinesToCart", () => {
  it("emite líneas DTE separadas por host y agregados", () => {
    const lines: PosDiningOrderLine[] = [
      {
        id: "l1",
        productVariantId: "host-a",
        quantity: 2,
        kitchenStatus: "SENT",
        addons: [
          {
            id: "a1",
            addonVariantId: "addon-x",
            name: "Doble queso",
            quantity: 1,
          },
        ],
      },
      {
        id: "l2",
        productVariantId: "host-b",
        quantity: 1,
        kitchenStatus: "SENT",
        addons: [
          {
            id: "a2",
            addonVariantId: "addon-y",
            name: "Extra aceituna",
            quantity: 2,
          },
        ],
      },
    ];
    const cart = diningOrderLinesToCart(lines, [
      item("host-a", "Pizza A"),
      item("host-b", "Pizza B"),
      item("addon-x", "Doble queso"),
      item("addon-y", "Extra aceituna"),
    ]);
    expect(cart).toHaveLength(4);
    expect(cart.find((c) => c.variantId === "host-a")?.quantity).toBe(2);
    expect(cart.find((c) => c.variantId === "addon-x")?.quantity).toBe(2);
    expect(cart.find((c) => c.variantId === "host-b")?.quantity).toBe(1);
    expect(cart.find((c) => c.variantId === "addon-y")?.quantity).toBe(2);
  });

  it("ignora líneas canceladas", () => {
    const lines: PosDiningOrderLine[] = [
      {
        id: "l1",
        productVariantId: "host-a",
        quantity: 1,
        kitchenStatus: "CANCELLED",
      },
    ];
    const cart = diningOrderLinesToCart(lines, [item("host-a", "Pizza")]);
    expect(cart).toHaveLength(0);
  });
});
