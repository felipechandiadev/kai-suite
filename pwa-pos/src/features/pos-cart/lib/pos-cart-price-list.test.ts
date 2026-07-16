import { describe, expect, it } from "vitest";
import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import type { PosProductSearchItem } from "@/features/pos-products/types/pos-product.types";
import {
  assertCartSinglePriceList,
  backfillCartLinesPriceList,
  CART_MIXED_PRICE_LIST_MESSAGE,
  tryAddItemWithPriceList,
} from "./pos-cart-price-list";

function item(variantId: string): PosProductSearchItem {
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

const listA = { priceListId: "list-a", priceListName: "Lista A" };
const listB = { priceListId: "list-b", priceListName: "Lista B" };

describe("tryAddItemWithPriceList", () => {
  it("adds and stamps price list on empty cart", () => {
    const next = tryAddItemWithPriceList([], item("v1"), listA, 1);
    expect(next).toHaveLength(1);
    expect(next![0].priceListId).toBe("list-a");
    expect(next![0].priceListName).toBe("Lista A");
  });

  it("allows same price list", () => {
    const first = tryAddItemWithPriceList([], item("v1"), listA, 1)!;
    const next = tryAddItemWithPriceList(first, item("v2"), listA, 1);
    expect(next).toHaveLength(2);
  });

  it("rejects different price list", () => {
    const first = tryAddItemWithPriceList([], item("v1"), listA, 1)!;
    const next = tryAddItemWithPriceList(first, item("v2"), listB, 1);
    expect(next).toBeNull();
  });
});

describe("assertCartSinglePriceList", () => {
  it("fails when lines have distinct lists", () => {
    const lines = [
      { ...item("v1"), quantity: 1, priceListId: "a" },
      { ...item("v2"), quantity: 1, priceListId: "b" },
    ] as PosCartLine[];
    const res = assertCartSinglePriceList(lines);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toBe(CART_MIXED_PRICE_LIST_MESSAGE);
  });
});

describe("backfillCartLinesPriceList", () => {
  it("fills missing stamp from session", () => {
    const lines = [{ ...item("v1"), quantity: 1 } as PosCartLine];
    const next = backfillCartLinesPriceList(lines, listA);
    expect(next[0].priceListId).toBe("list-a");
    expect(next[0].priceListName).toBe("Lista A");
  });
});
