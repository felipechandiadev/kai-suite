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
    taxCategory: "AFFECTED",
    requiresDte: true,
    taxIds: [],
  };
}

const stamp = { priceListId: "list-1", priceListName: "Lista 1" };

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
      stamp,
    );
    expect(next).toHaveLength(1);
    expect(next![0].variantId).toBe("v1");
    expect(next![0].quantity).toBe(2);
    expect(next![0].unitPrice).toBe(1000);
    expect(next![0].priceListId).toBe("list-1");
  });

  it("sums quantity when variant already exists in cart", () => {
    const existing: PosCartLine[] = [
      { ...listItem("v1"), quantity: 3, priceListId: "list-1", priceListName: "Lista 1" },
    ];
    const next = mergePresaleTicketIntoCart(
      existing,
      ticketMeta("t2", { v1: 1 }),
      [listItem("v1")],
      stamp,
    );
    expect(next).toHaveLength(1);
    expect(next![0].quantity).toBe(4);
    expect(next![0].unitPrice).toBe(1000);
  });

  it("rejects when ticket stamp differs from cart list", () => {
    const existing: PosCartLine[] = [
      { ...listItem("v1"), quantity: 1, priceListId: "list-other", priceListName: "Otra" },
    ];
    const next = mergePresaleTicketIntoCart(
      existing,
      ticketMeta("t3", { v2: 1 }),
      [listItem("v2")],
      stamp,
    );
    expect(next).toBeNull();
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
