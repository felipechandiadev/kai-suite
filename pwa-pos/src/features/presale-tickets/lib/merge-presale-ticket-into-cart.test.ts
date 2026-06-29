import { describe, expect, it } from "vitest";
import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import type { LoadedPresaleTicketMeta } from "@/features/pos-cart/types/pos-cart-mode.types";
import type { PosProductSearchItem } from "@/features/pos-products/types/pos-product.types";
import {
  mergePresaleTicketIntoCart,
  subtractPresaleTicketFromCart,
} from "./merge-presale-ticket-into-cart";

function listItem(variantId: string): PosProductSearchItem {
  return {
    productId: "p1",
    productName: "Product",
    productDescription: null,
    productImageUrl: null,
    variantId,
    sku: null,
    barcode: null,
    unitSymbol: "u",
    unitId: null,
    unitAllowDecimals: false,
    unitPrice: 1000,
    unitTaxRate: 0.19,
    unitTaxAmount: 190,
    unitPriceWithTax: 1190,
    trackInventory: true,
    availableStock: 10,
    availableStockBase: null,
    attributes: [],
    metadata: null,
  };
}

function ticketMeta(
  id: string,
  lineMaxQtyByVariantId: Record<string, number>,
): LoadedPresaleTicketMeta {
  return {
    id,
    code: id,
    total: 0,
    createdAt: "",
    lineMaxQtyByVariantId,
  };
}

describe("mergePresaleTicketIntoCart", () => {
  it("creates a line from list price when variant is new", () => {
    const next = mergePresaleTicketIntoCart(
      [],
      ticketMeta("t1", { v1: 2 }),
      [listItem("v1")],
    );
    expect(next).toHaveLength(1);
    expect(next[0].variantId).toBe("v1");
    expect(next[0].quantity).toBe(2);
    expect(next[0].unitPrice).toBe(1000);
  });

  it("sums quantity when variant already exists in cart", () => {
    const existing: PosCartLine[] = [{ ...listItem("v1"), quantity: 3 } as PosCartLine];
    const next = mergePresaleTicketIntoCart(
      existing,
      ticketMeta("t2", { v1: 1 }),
      [listItem("v1")],
    );
    expect(next).toHaveLength(1);
    expect(next[0].quantity).toBe(4);
    expect(next[0].unitPrice).toBe(1000);
  });
});

describe("subtractPresaleTicketFromCart", () => {
  it("subtracts ticket quantities and removes empty lines", () => {
    const lines: PosCartLine[] = [
      { ...listItem("v1"), quantity: 4 } as PosCartLine,
      { ...listItem("v2"), quantity: 1 } as PosCartLine,
    ];
    const next = subtractPresaleTicketFromCart(lines, ticketMeta("t1", { v1: 2 }));
    expect(next).toHaveLength(2);
    expect(next.find((l) => l.variantId === "v1")?.quantity).toBe(2);
    expect(next.find((l) => l.variantId === "v2")?.quantity).toBe(1);
  });
});
